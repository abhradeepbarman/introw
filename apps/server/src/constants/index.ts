export const BCRYPT_ROUNDS = 12;

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL = '30d';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const OAUTH_STATE_COOKIE = 'oauth_state';

export const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;
export const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
export const OAUTH_STATE_MAX_AGE = 10 * 60 * 1000;

export const PASSWORD_TOKEN_TTL = 60 * 60 * 1000;

export const PLANS = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    price: 0,
    currency: 'INR',
    credits: 1,
    maxInterviewMinutes: 2,
    features: ['1 interview credit', 'Max interview: 2 minutes'],
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    price: 999,
    currency: 'INR',
    credits: 10,
    maxInterviewMinutes: 5,
    features: ['10 interview credits', 'Max interview: 5 minutes', 'Resume upload (soon)'],
  },
} as const;

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
