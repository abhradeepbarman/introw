import {
  interviewSourcesSchema,
  paginationQuerySchema,
  rubricSchema,
} from '@repo/common/validations';
import axios from 'axios';
import envConfig from '../config/env';
import { PLANS } from '../constants';
import { prisma } from '@repo/db';
import { uploadResume } from '../lib/imagekit';
import { initSideband } from '../lib/sideband';
import { buildReportPdf } from '../templates';
import asyncHandler from '../utils/async-handler';
import CustomErrorHandler from '../utils/custom-error-handler';
import { evaluateInterview } from '../utils/evaluate-interview';
import { parseResume } from '../utils/parse-resume';
import ResponseHandler from '../utils/response-handler';

type GithubRepo = {
  name: string;
  description: string | null;
  language: string | null;
  fork?: boolean;
  archived?: boolean;
};

const ownedBy = (interviewId: string, userId: string) => ({
  id: interviewId,
  OR: [{ userId }, { userId: null }],
});

const fetchGithubMetadata = async (githubUrl: string) => {
  const githubUsername = githubUrl.replace(/\/+$/, '').split('/').pop();

  if (!githubUsername) {
    throw CustomErrorHandler.badRequest('Invalid GitHub URL');
  }

  const githubApiUrl = `https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos`;

  let response;
  try {
    response = await axios.get<GithubRepo[]>(githubApiUrl, {
      params: {
        per_page: 100,
        sort: 'pushed',
        direction: 'desc',
        type: 'owner',
      },
      headers: {
        Accept: 'application/vnd.github+json',
      },
      timeout: 15000,
      proxy: {
        protocol: 'http',
        host: envConfig.CRAWLBASE_PROXY_HOST,
        port: envConfig.CRAWLBASE_PROXY_PORT,
        auth: {
          username: envConfig.CRAWLBASE_PROXY_KEY,
          password: '',
        },
      },
    });
  } catch (err: any) {
    if (err.response?.status === 404) {
      throw CustomErrorHandler.notFound('GitHub user not found');
    }
    if (err.response?.status === 403 || err.response?.status === 429) {
      throw new CustomErrorHandler(429, 'GitHub rate limit exceeded, try again shortly');
    }
    throw err;
  }

  const raw = Array.isArray(response.data) ? response.data : [];

  const githubMetadata = raw
    .filter((r) => !r.fork && !r.archived && (r.description || r.language))
    .slice(0, 8)
    .map((r) => ({
      name: r.name,
      language: r.language,
      description: r.description?.slice(0, 120) ?? null,
    }));

  if (githubMetadata.length === 0) {
    throw new CustomErrorHandler(422, 'No suitable public repositories found for this user');
  }

  return githubMetadata;
};

export const createInterview = asyncHandler(async (req, res, next) => {
  const { githubUrl } = interviewSourcesSchema.parse(req.body);

  if (!githubUrl && !req.file) {
    return next(CustomErrorHandler.badRequest('Add a GitHub profile, a résumé, or both'));
  }

  // Either source alone is enough, but a source the candidate did supply has to work —
  // failing loudly beats interviewing them on half of what they handed us.
  const githubMetadata = githubUrl ? await fetchGithubMetadata(githubUrl) : [];

  const [resumeUrl, resumeData] = req.file
    ? await Promise.all([uploadResume(req.file.buffer, req.user.id), parseResume(req.file.buffer)])
    : [];

  const newInterview = await prisma.interview.create({
    data: {
      githubMetadata,
      resumeUrl,
      resumeData,
      userId: req.user.id,
    },
  });

  return res.status(201).send(
    ResponseHandler(201, 'Interview created successfully', {
      id: newInterview.id,
    }),
  );
});

const sessionConfig = {
  type: 'realtime',
  model: 'gpt-realtime-2.1',
  instructions: `You are an AI interviewer conducting a technical interview.`,
  audio: {
    input: {
      turn_detection: {
        type: 'server_vad',
      },
      transcription: {
        model: 'gpt-4o-mini-transcribe',
        language: 'en',
        prompt: 'Technical software engineering interview.',
      },
    },
    output: {
      voice: 'marin',
    },
  },
};

export const createSession = asyncHandler(async (req, res, next) => {
  const { id: interviewId } = req.params as { id: string };
  const { id: userId } = req.user;

  const interview = await prisma.interview.findFirst({
    where: ownedBy(interviewId, userId),
  });

  if (!interview) {
    return next(CustomErrorHandler.notFound('Interview not found'));
  }

  if (interview.status === 'COMPLETED') {
    return next(CustomErrorHandler.badRequest('This interview has already ended'));
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { freeCredits: true, paidCredits: true },
  });

  const isFirstStart = interview.startedAt === null;

  // Paid credits are spent first, and the bucket the credit came from sets the duration —
  // so a leftover free credit stays a 2-minute interview even on the Starter plan, and a
  // paid credit stays a 5-minute one even after the subscription lapses.
  const usePaidCredit = (user?.paidCredits ?? 0) > 0;

  if (isFirstStart && !usePaidCredit && (user?.freeCredits ?? 0) <= 0) {
    return next(CustomErrorHandler.badRequest('You have no interview credits left'));
  }

  const maxTime = isFirstStart
    ? PLANS[usePaidCredit ? 'STARTER' : 'FREE'].maxInterviewMinutes * 60
    : interview.maxTime;

  const elapsed = isFirstStart
    ? 0
    : Math.floor((Date.now() - interview.startedAt!.getTime()) / 1000);
  const remaining = maxTime - elapsed;

  if (remaining <= 0) {
    return next(CustomErrorHandler.badRequest('This interview has run out of time'));
  }

  const fd = new FormData();
  fd.set('sdp', req.body);
  fd.set('session', JSON.stringify(sessionConfig));

  const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${envConfig.OPENAI_API_KEY}`,
      'OpenAI-Safety-Identifier': `intervue-${userId}`,
    },
    body: fd,
  });
  const sdp = await sdpResponse.text();

  const location = sdpResponse.headers.get('Location');
  const callId = location?.split('/').pop();

  if (!callId) return next(CustomErrorHandler.notAllowed('Call ID not found in response'));

  await prisma.$transaction([
    prisma.interview.update({
      where: { id: interview.id },
      data: {
        status: 'IN_PROGRESS',
        callId,
        maxTime,
        ...(isFirstStart && { startedAt: new Date() }),
      },
    }),
    ...(isFirstStart
      ? [
          prisma.user.update({
            where: { id: userId },
            data: usePaidCredit
              ? { paidCredits: { decrement: 1 } }
              : { freeCredits: { decrement: 1 } },
          }),
        ]
      : []),
  ]);

  await initSideband(callId, interview, remaining);

  return res
    .status(200)
    .send(ResponseHandler(200, 'Session created successfully', { sdp, remainingTime: remaining }));
});

export const listInterviews = asyncHandler(async (req, res) => {
  const { page, limit } = paginationQuerySchema.parse(req.query);
  const where = { userId: req.user.id };

  const [total, interviews] = await prisma.$transaction([
    prisma.interview.count({ where }),
    prisma.interview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        createdAt: true,
        status: true,
        result: { select: { score: true } },
        _count: { select: { conversations: true } },
      },
    }),
  ]);

  const items = interviews.map((interview) => ({
    id: interview.id,
    createdAt: interview.createdAt,
    status: interview.status,
    score: interview.result?.score ?? 0,
    hasReport: Boolean(interview.result),
    messageCount: interview._count.conversations,
  }));

  return res.status(200).send(
    ResponseHandler(200, 'Interviews fetched successfully', {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }),
  );
});

export const downloadReport = asyncHandler(async (req, res, next) => {
  const { id: interviewId } = req.params as { id: string };

  const interview = await prisma.interview.findFirst({
    where: ownedBy(interviewId, req.user.id),
    include: { result: true },
  });

  if (!interview) {
    return next(CustomErrorHandler.notFound('Interview not found'));
  }

  if (!interview.result) {
    return next(CustomErrorHandler.badRequest('This interview has not been evaluated yet'));
  }

  const stored = rubricSchema.safeParse(interview.result.rubric);

  const pdf = await buildReportPdf({
    id: interview.id,
    createdAt: interview.createdAt,
    score: interview.result.score,
    feedback: interview.result.feedback,
    rubric: stored.success ? stored.data : null,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="intervue-report-${interview.id}.pdf"`,
  );

  return res.status(200).send(Buffer.from(pdf));
});

export const downloadTranscript = asyncHandler(async (req, res, next) => {
  const { id: interviewId } = req.params as { id: string };

  const interview = await prisma.interview.findFirst({
    where: ownedBy(interviewId, req.user.id),
    include: { conversations: { orderBy: { createdAt: 'asc' } } },
  });

  if (!interview) {
    return next(CustomErrorHandler.notFound('Interview not found'));
  }

  if (interview.conversations.length === 0) {
    return next(CustomErrorHandler.badRequest('This interview has no conversation to download'));
  }

  const lines = interview.conversations.map(
    (m) => `${m.createdBy === 'CANDIDATE' ? 'Candidate' : 'Interviewer'}: ${m.message}`,
  );

  const header = [
    'Intervue — interview transcript',
    `Interview: ${interview.id}`,
    `Date: ${interview.createdAt.toISOString()}`,
  ].join('\n');

  const file = `${header}\n\n${lines.join('\n\n')}\n`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="intervue-transcript-${interview.id}.txt"`,
  );

  return res.status(200).send(file);
});

export const getInterviewResult = asyncHandler(async (req, res, next) => {
  const { id: interviewId } = req.params as { id: string };

  const interview = await prisma.interview.findFirst({
    where: ownedBy(interviewId, req.user.id),
    include: { conversations: { orderBy: { createdAt: 'asc' } }, result: true },
  });

  if (!interview) {
    return next(CustomErrorHandler.notFound('Interview not found'));
  }

  const transcript = interview.conversations.map((m) => ({
    speaker: m.createdBy,
    message: m.message,
    at: m.createdAt,
  }));

  if (interview.result) {
    const stored = rubricSchema.safeParse(interview.result.rubric);

    return res.status(200).send(
      ResponseHandler(200, 'Interview result', {
        score: interview.result.score,
        feedback: interview.result.feedback,
        rubric: stored.success ? stored.data : null,
        transcript,
      }),
    );
  }

  if (interview.conversations.length === 0) {
    return next(
      CustomErrorHandler.badRequest('This interview has no conversation to evaluate yet'),
    );
  }

  const { score, feedback, rubric } = await evaluateInterview(interview.conversations);

  await prisma.$transaction([
    prisma.interviewResult.create({ data: { interviewId, score, feedback, rubric } }),
    prisma.interview.update({ where: { id: interviewId }, data: { status: 'COMPLETED' } }),
  ]);

  return res.status(200).send(
    ResponseHandler(200, 'Interview evaluated successfully', {
      score,
      feedback,
      rubric,
      transcript,
    }),
  );
});
