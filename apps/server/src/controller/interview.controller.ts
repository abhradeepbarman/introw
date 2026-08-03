import { interviewSourcesSchema, rubricSchema } from '@repo/common/validations';
import axios from 'axios';
import envConfig from '../config/env';
import { prisma } from '../lib/prisma';
import asyncHandler from '../utils/async-handler';
import CustomErrorHandler from '../utils/custom-error-handler';
import { evaluateInterview } from '../utils/evaluate-interview';
import ResponseHandler from '../utils/response-handler';
import { initSideband } from '../utils/sideband';

type GithubRepo = {
  name: string;
  description: string | null;
  language: string | null;
  fork?: boolean;
  archived?: boolean;
};

export const createInterview = asyncHandler(async (req, res) => {
  const { githubUrl } = interviewSourcesSchema.parse(req.body);
  const githubUsername = githubUrl.replace(/\/+$/, '').split('/').pop();

  if (!githubUsername) {
    return res.status(400).send(ResponseHandler(400, 'Invalid GitHub URL', null));
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
      return res.status(404).send(ResponseHandler(404, 'GitHub user not found', null));
    }
    if (err.response?.status === 403 || err.response?.status === 429) {
      return res
        .status(429)
        .send(ResponseHandler(429, 'GitHub rate limit exceeded, try again shortly', null));
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
    return res
      .status(422)
      .send(ResponseHandler(422, 'No suitable public repositories found for this user', null));
  }

  const newInterview = await prisma.interview.create({
    data: {
      githubMetadata,
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

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
  });

  if (!interview) {
    return next(CustomErrorHandler.notFound('Interview not found'));
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

  await initSideband(callId, interview);

  return res.status(200).send(ResponseHandler(200, 'Session created successfully', { sdp }));
});

export const downloadTranscript = asyncHandler(async (req, res, next) => {
  const { id: interviewId } = req.params as { id: string };

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
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

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { conversations: { orderBy: { createdAt: 'asc' } } },
  });

  if (!interview) {
    return next(CustomErrorHandler.notFound('Interview not found'));
  }

  const transcript = interview.conversations.map((m) => ({
    speaker: m.createdBy,
    message: m.message,
    at: m.createdAt,
  }));

  if (interview.status === 'COMPLETED' && interview.feedback) {
    const stored = rubricSchema.safeParse(interview.rubric);

    return res.status(200).send(
      ResponseHandler(200, 'Interview result', {
        score: interview.score,
        feedback: interview.feedback,
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

  await prisma.interview.update({
    where: { id: interviewId },
    data: { score, feedback, rubric, status: 'COMPLETED' },
  });

  return res.status(200).send(
    ResponseHandler(200, 'Interview evaluated successfully', {
      score,
      feedback,
      rubric,
      transcript,
    }),
  );
});
