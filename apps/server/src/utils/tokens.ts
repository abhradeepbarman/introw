import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import envConfig from '../config/env';
import {
  ACCESS_COOKIE_MAX_AGE,
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL,
  REFRESH_COOKIE_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL,
} from '../constants';

const isProduction = () => envConfig.NODE_ENV === 'production';

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  maxAge,
  path: '/',
  secure: isProduction(),
  sameSite: isProduction() ? ('none' as const) : ('lax' as const),
});

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, envConfig.ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
  const refreshToken = jwt.sign({ id: userId }, envConfig.REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });

  return { accessToken, refreshToken };
};

export const setCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_COOKIE_MAX_AGE));
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_COOKIE_MAX_AGE));
};

export const clearAuthCookies = (res: Response) => {
  const { maxAge: _access, ...accessOptions } = cookieOptions(ACCESS_COOKIE_MAX_AGE);
  const { maxAge: _refresh, ...refreshOptions } = cookieOptions(REFRESH_COOKIE_MAX_AGE);

  res.clearCookie(ACCESS_TOKEN_COOKIE, accessOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, refreshOptions);
};

/**
 * Refresh and password-reset tokens are stored as digests so a database leak
 * cannot be replayed against the API.
 */
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
