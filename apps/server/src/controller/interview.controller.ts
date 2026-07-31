import axios from 'axios';
import asyncHandler from '../utils/async-handler';
import { interviewSourcesSchema } from '@repo/common/validations';
import envConfig from '../config/env';
import { prisma } from '../lib/prisma';
import ResponseHandler from '../utils/response-handler';
import CustomErrorHandler from '../utils/custom-error-handler';
import { initSideband } from '../utils/sideband';

export const preInterviewHandler = asyncHandler(async (req, res) => {
  const { githubUrl } = interviewSourcesSchema.parse(req.body);
  const githubUsername = githubUrl.replace(/\/+$/, '').split('/').pop();
  const githubApiUrl = `https://api.github.com/users/${githubUsername}/repos`;

  const response = await axios.get(githubApiUrl, {
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

  // res.json({ data: response.data });
  const newInterview = await prisma.interview.create({
    data: {
      githubMetadata: response.data,
    },
  });

  return res.status(201).send(
    ResponseHandler(201, 'Interview created successfully', {
      id: newInterview.id,
    }),
  );
});

const sessionConfig = JSON.stringify({
  type: 'realtime',
  model: 'gpt-realtime-2.1',
  audio: {
    output: { voice: 'marin' },
  },
});

export const sessionHandler = asyncHandler(async (req, res, next) => {
  const { id: interviewId } = req.params as { id: string };

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
  });

  if (!interview) {
    return next(CustomErrorHandler.notFound('Interview not found'));
  }

  const fd = new FormData();
  fd.set('sdp', req.body);
  fd.set('session', sessionConfig);

  const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${envConfig.OPENAI_API_KEY}`,
      // TODO: add hashed user id to the request header for safety check when auth added
      // 'OpenAI-Safety-Identifier': 'hashed-user-id',
    },
    body: fd,
  });
  // Send back the SDP we received from the OpenAI REST API
  const sdp = await sdpResponse.text();

  const location = sdpResponse.headers.get('Location');
  const callId = location?.split('/').pop();

  if (!callId) return next(CustomErrorHandler.notAllowed('Call ID not found in response'));

  await initSideband(callId, interviewId);

  return res.status(200).send(ResponseHandler(200, 'Session created successfully', { sdp }));
});
