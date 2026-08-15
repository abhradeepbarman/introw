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

export const MAX_INTERVIEW_MINUTES = 1;
export const INTERVIEW_WRAP_UP_SECONDS = 30;

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
