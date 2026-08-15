import {
  interviewSourcesSchema,
  paginationQuerySchema,
  rubricSchema,
  RESUME_MIME_TYPE,
} from '@repo/common/validations';
import { readFile, unlink } from 'fs/promises';
import { envConfig, sessionConfig } from '../config';
import { InterviewStatus, prisma, UserType } from '@repo/db';
import { initSideband, scheduleInterviewEnd, uploadFile } from '../lib';
import { fetchGithubMetadata } from '../services';
import { buildReportPdf } from '../templates';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';
import { evaluateInterview, parseResume } from '../services/ai';

export const createInterview = asyncHandler(async (req, res, next) => {
  const { githubUrl } = interviewSourcesSchema.parse(req.body);
  const { file } = req;

  if (!githubUrl && !file) {
    return next(CustomErrorHandler.badRequest('Add a GitHub profile, a résumé, or both'));
  }

  const githubMetadata = githubUrl ? await fetchGithubMetadata(githubUrl) : [];

  let resumeUrl: string | undefined;
  let resumeData: Awaited<ReturnType<typeof parseResume>> | undefined;

  if (file) {
    const buffer = await readFile(file.path);
    try {
      [resumeUrl, resumeData] = await Promise.all([
        uploadFile(buffer, `${req.user.id}-${Date.now()}.pdf`, '/resumes', RESUME_MIME_TYPE),
        parseResume(buffer),
      ]);
    } finally {
      await unlink(file.path).catch(() => {});
    }
  }

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

export const startSession = asyncHandler(async (req, res, next) => {
  const { id: interviewId } = req.params as { id: string };
  const { id: userId } = req.user;

  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, OR: [{ userId }, { userId: null }] },
  });

  if (!interview) {
    return next(CustomErrorHandler.notFound('Interview not found'));
  }

  if (interview.status === InterviewStatus.COMPLETED) {
    return next(CustomErrorHandler.badRequest('This interview has already ended'));
  }

  // Only the first start costs a session; reconnects reuse the original clock
  const isFirstStart = interview.status === InterviewStatus.PENDING;
  const startedAt = interview.startedAt ?? new Date();

  if (isFirstStart) {
    const charged = await prisma.user.updateMany({
      where: { id: userId, credits: { gt: 0 } },
      data: { credits: { decrement: 1 } },
    });

    if (charged.count === 0) {
      return next(CustomErrorHandler.paymentRequired('No interview sessions left'));
    }
  }

  //#region Connect to OpenAI Realtime API  for SDP exchange and call creation

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

  if (!callId) {
    if (isFirstStart) {
      await prisma.user.update({ where: { id: userId }, data: { credits: { increment: 1 } } });
    }

    return next(CustomErrorHandler.notAllowed('Call ID not found in response'));
  }

  await prisma.interview.update({
    where: { id: interview.id },
    data: { status: 'IN_PROGRESS', callId, startedAt },
  });

  //#endregion

  await initSideband(callId, interview);
  await scheduleInterviewEnd(callId, startedAt);

  return res.status(200).send(ResponseHandler(200, 'Session created successfully', { sdp }));
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
    where: { id: interviewId, OR: [{ userId: req.user.id }, { userId: null }] },
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
    where: { id: interviewId, OR: [{ userId: req.user.id }, { userId: null }] },
    include: { conversations: { orderBy: { createdAt: 'asc' } } },
  });

  if (!interview) {
    return next(CustomErrorHandler.notFound('Interview not found'));
  }

  if (interview.conversations.length === 0) {
    return next(CustomErrorHandler.badRequest('This interview has no conversation to download'));
  }

  const lines = interview.conversations.map(
    (m) => `${m.createdBy === UserType.CANDIDATE ? 'Candidate' : 'Interviewer'}: ${m.message}`,
    (m) => `${m.createdBy === UserType.CANDIDATE ? 'Candidate' : 'Interviewer'}: ${m.message}`,
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
    where: { id: interviewId, OR: [{ userId: req.user.id }, { userId: null }] },
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
