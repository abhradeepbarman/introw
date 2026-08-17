import axios from 'axios';
import { envConfig } from '../config';
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

const CRAWLBASE_ENDPOINT = 'https://api.crawlbase.com/';

const githubGet = async <T>(url: string): Promise<{ data: T; status: number }> => {
  const response = await axios.get<T>(CRAWLBASE_ENDPOINT, {
    timeout: REQUEST_TIMEOUT_MS,
    params: {
      token: envConfig.CRAWLBASE_PROXY_TOKEN,
      url,
      request_headers: [
        'Accept:application/vnd.github+json',
        ...(envConfig.GH_TOKEN ? [`Authorization:Bearer ${envConfig.GH_TOKEN}`] : []),
      ].join('|'),
    },
  });

  return { data: response.data, status: Number(response.headers['original_status']) };
};

const fetchReadmeDepth = async (owner: string, repo: string): Promise<ReadmeDepth> => {
  try {
    const { data, status } = await githubGet<{ size: number }>(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
    );
    if (status !== 200 || !data.size) return 'none';
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
      `https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos?per_page=100&sort=pushed&direction=desc&type=owner`,
    );
  } catch (err) {
    if (axios.isAxiosError(err) && err.code === 'ECONNABORTED') {
      throw new CustomErrorHandler(504, 'GitHub request timed out, try again shortly');
    }
    throw err;
  }

  if (response.status === 404) throw CustomErrorHandler.notFound('GitHub user not found');
  if (response.status === 403 || response.status === 429) {
    throw new CustomErrorHandler(429, 'GitHub rate limit exceeded, try again shortly');
  }
  if (response.status !== 200) {
    throw new CustomErrorHandler(502, 'Could not reach GitHub, try again shortly');
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
