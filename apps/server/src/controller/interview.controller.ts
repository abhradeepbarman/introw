import axios from 'axios';
import asyncHandler from '../utils/async-handler';
import { interviewSourcesSchema } from '@repo/common/validations';
import envConfig from '../config/env';
import { prisma } from '../lib/prisma';
import ResponseHandler from '../utils/response-handler';

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
