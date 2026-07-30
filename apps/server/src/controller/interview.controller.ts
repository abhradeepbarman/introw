import axios from 'axios';
import asyncHandler from '../utils/async-handler';
import { interviewSourcesSchema } from '@repo/common/validations';
import envConfig from '../config/env';

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

  res.json({ data: response.data });
});
