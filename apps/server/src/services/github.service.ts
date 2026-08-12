import axios from 'axios';
import envConfig from '../config/env';
import { CustomErrorHandler } from '../utils';

const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const MAX_REPOS = 8;
const DESCRIPTION_MAX_LENGTH = 120;
const REQUEST_TIMEOUT_MS = 15000;
const README_BRIEF_THRESHOLD_BYTES = 500;

type ReadmeDepth = 'none' | 'brief' | 'detailed';

type GithubProjectMetadata = {
  name: string;
  language: string | null;
  description: string | null;
  stars: number;
  forks: number;
  readmeDepth: ReadmeDepth;
  qualityScore: number;
};

interface GithubRepoOwner {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: 'User' | 'Organization';
}

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: GithubRepoOwner;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  disabled: boolean;

  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  size: number;

  default_branch: string;
  visibility: 'public' | 'private' | 'internal';
  license: { key: string; name: string; spdx_id: string } | null;
  topics: string[];

  created_at: string;
  updated_at: string;
  pushed_at: string;

  homepage: string | null;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_downloads: boolean;
}

const extractGithubUsername = (input: string): string | null => {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'github.com') return null;
    const [username] = url.pathname.split('/').filter(Boolean);
    return username && GITHUB_USERNAME_REGEX.test(username) ? username : null;
  } catch {
    return GITHUB_USERNAME_REGEX.test(trimmed) ? trimmed : null;
  }
};

const truncateDescription = (description: string | null | undefined): string | null => {
  if (!description) return null;
  if (description.length <= DESCRIPTION_MAX_LENGTH) return description;
  return `${description.slice(0, DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`;
};

const githubGet = <T>(url: string, params?: Record<string, unknown>) =>
  axios.get<T>(url, {
    params,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Accept: 'application/vnd.github+json',
      ...(envConfig.GITHUB_TOKEN ? { Authorization: `Bearer ${envConfig.GITHUB_TOKEN}` } : {}),
    },
    proxy: {
      protocol: 'http',
      host: envConfig.CRAWLBASE_PROXY_HOST,
      port: envConfig.CRAWLBASE_PROXY_PORT,
      auth: { username: envConfig.CRAWLBASE_PROXY_KEY, password: '' },
    },
  });

const fetchReadmeDepth = async (owner: string, repo: string): Promise<ReadmeDepth> => {
  try {
    const { data } = await githubGet<{ size: number }>(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
    );
    if (!data.size) return 'none';
    return data.size < README_BRIEF_THRESHOLD_BYTES ? 'brief' : 'detailed';
  } catch {
    return 'none';
  }
};

export const fetchGithubMetadata = async (githubUrl: string): Promise<GithubProjectMetadata[]> => {
  const githubUsername = extractGithubUsername(githubUrl);
  if (!githubUsername) {
    throw CustomErrorHandler.badRequest('Invalid GitHub URL or username');
  }

  let response;
  try {
    response = await githubGet<GithubRepo[]>(
      `https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos`,
      { per_page: 100, sort: 'pushed', direction: 'desc', type: 'owner' },
    );
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED') {
        throw new CustomErrorHandler(504, 'GitHub request timed out, try again shortly');
      }
      const status = err.response?.status;
      if (status === 404) throw CustomErrorHandler.notFound('GitHub user not found');
      if (status === 403 || status === 429) {
        throw new CustomErrorHandler(429, 'GitHub rate limit exceeded, try again shortly');
      }
    }
    throw err;
  }

  const raw = Array.isArray(response.data) ? response.data : [];

  const ranked = raw
    .filter((r) => !r.fork && !r.archived)
    .map((r) => ({
      repo: r,
      qualityScore: (r.stargazers_count ?? 0) * 3 + (r.forks_count ?? 0) * 2,
    }))
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, MAX_REPOS);

  if (ranked.length === 0) {
    throw new CustomErrorHandler(422, 'No suitable public repositories found for this user');
  }

  const readmeDepths = await Promise.allSettled(
    ranked.map(({ repo }) => fetchReadmeDepth(githubUsername, repo.name)),
  );

  const githubMetadata: GithubProjectMetadata[] = ranked.map(({ repo, qualityScore }, i) => {
    const depthResult = readmeDepths[i];
    return {
      name: repo.name,
      language: repo.language,
      description: truncateDescription(repo.description),
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      readmeDepth: depthResult.status === 'fulfilled' ? depthResult.value : 'none',
      qualityScore,
    };
  });

  return githubMetadata;
};
