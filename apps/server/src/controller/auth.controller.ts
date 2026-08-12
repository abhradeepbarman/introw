import { AuthProvider } from '@repo/common/types';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@repo/common/validations';
import { prisma } from '@repo/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import envConfig from '../config/env';
import {
  BCRYPT_ROUNDS,
  GOOGLE_AUTH_URL,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
  PASSWORD_TOKEN_TTL,
  REFRESH_TOKEN_COOKIE,
} from '../constants';
import { getGoogleProfile, getGoogleTokens, sendEmail } from '../services';
import { forgotPasswordEmailTemplate } from '../templates';
import asyncHandler from '../utils/async-handler';
import CustomErrorHandler from '../utils/custom-error-handler';
import ResponseHandler from '../utils/response-handler';
import { clearAuthCookies, cookieOptions, generateTokens, setCookies } from '../utils/tokens';

export const userRegister = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, password, email } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(CustomErrorHandler.alreadyExist('An account with this email already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, authProvider: AuthProvider.LOCAL },
    });

    const { accessToken, refreshToken } = generateTokens(newUser.id);
    setCookies(res, accessToken, refreshToken);

    await prisma.user.update({
      where: { id: newUser.id },
      data: { refreshToken },
    });

    return res.status(201).send(
      ResponseHandler(201, 'User registered successfully', {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        authProvider: newUser.authProvider,
        credits: newUser.credits,
        access_token: accessToken,
      }),
    );
  },
);

export const userLogin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { password, email } = loginSchema.parse(req.body);

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser || existingUser.authProvider !== AuthProvider.LOCAL || !existingUser.password) {
    return next(CustomErrorHandler.wrongCredentials());
  }

  const isPasswordValid = await bcrypt.compare(password, existingUser.password);
  if (!isPasswordValid) {
    return next(CustomErrorHandler.wrongCredentials());
  }

  const { accessToken, refreshToken } = generateTokens(existingUser.id);
  setCookies(res, accessToken, refreshToken);

  await prisma.user.update({
    where: { id: existingUser.id },
    data: { refreshToken },
  });

  return res.status(200).send(
    ResponseHandler(200, 'User logged in successfully', {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      authProvider: existingUser.authProvider,
      credits: existingUser.credits,
      access_token: accessToken,
    }),
  );
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).send(ResponseHandler(200, 'Current user', req.user));
});

export const userLogout = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { refreshToken: null },
    select: { id: true, name: true },
  });

  clearAuthCookies(res);

  return res.status(200).send(ResponseHandler(200, 'User logged out successfully', user));
});

export const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refresh_token;
    if (!token) {
      return next(CustomErrorHandler.unAuthorized());
    }

    const decoded = jwt.verify(token, envConfig.REFRESH_SECRET) as JwtPayload;
    if (!decoded?.id) {
      return next(CustomErrorHandler.unAuthorized());
    }

    const userDetails = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!userDetails?.refreshToken || userDetails.refreshToken !== token) {
      return next(CustomErrorHandler.unAuthorized());
    }

    const { accessToken, refreshToken } = generateTokens(userDetails.id);
    setCookies(res, accessToken, refreshToken);

    await prisma.user.update({
      where: { id: userDetails.id },
      data: { refreshToken },
    });

    return res.status(200).send(
      ResponseHandler(200, 'Refresh token generated', {
        id: userDetails.id,
        name: userDetails.name,
        email: userDetails.email,
        authProvider: userDetails.authProvider,
        credits: userDetails.credits,
        access_token: accessToken,
      }),
    );
  },
);

export const sendForgotPasswordEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  const genericResponse = () =>
    res
      .status(200)
      .send(
        ResponseHandler(200, 'If an account exists for that email, a reset link has been sent'),
      );

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!existingUser || existingUser.authProvider !== AuthProvider.LOCAL) {
    return genericResponse();
  }

  const token = jwt.sign({ id: existingUser.id }, envConfig.ACCESS_SECRET, {
    expiresIn: PASSWORD_TOKEN_TTL / 1000,
  });

  await prisma.$transaction([
    prisma.passwordToken.deleteMany({
      where: { userId: existingUser.id, usedAt: null },
    }),
    prisma.passwordToken.create({
      data: {
        userId: existingUser.id,
        token,
        expiresAt: new Date(Date.now() + PASSWORD_TOKEN_TTL),
      },
    }),
  ]);

  const link = `${envConfig.APP_URL}/reset-password/${token}`;
  const html = forgotPasswordEmailTemplate(existingUser.name, link);
  await sendEmail({ to: email, subject: 'Reset Your Password', body: html });

  return genericResponse();
});

export const resetPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params as { token: string };
    const { password } = resetPasswordSchema.parse(req.body);

    if (!token) {
      return next(CustomErrorHandler.badRequest('Token is invalid'));
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, envConfig.ACCESS_SECRET) as JwtPayload;
    } catch {
      return next(CustomErrorHandler.badRequest('Token is invalid or expired'));
    }

    const existingToken = await prisma.passwordToken.findFirst({
      where: { token, userId: decoded.id, usedAt: null },
    });

    if (!existingToken) {
      return next(CustomErrorHandler.badRequest('Token is invalid or expired'));
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: decoded.id },
        data: { password: hashedPassword, refreshToken: null },
      }),
      prisma.passwordToken.updateMany({
        where: { userId: decoded.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.status(200).send(ResponseHandler(200, 'Password reset successfully'));
  },
);

export const googleLogin = asyncHandler(
  async (_req: Request, res: Response, next: NextFunction) => {
    if (!envConfig.GOOGLE_AUTH_CLIENT_ID || !envConfig.GOOGLE_AUTH_CLIENT_SECRET) {
      return next(CustomErrorHandler.serverError('Google login is not configured'));
    }

    const state = jwt.sign({ n: crypto.randomBytes(16).toString('hex') }, envConfig.ACCESS_SECRET, {
      expiresIn: '10m',
    });

    res.cookie(OAUTH_STATE_COOKIE, state, cookieOptions(OAUTH_STATE_MAX_AGE));

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', envConfig.GOOGLE_AUTH_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', envConfig.GOOGLE_AUTH_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'online');
    authUrl.searchParams.set('prompt', 'select_account');

    return res.redirect(authUrl.toString());
  },
);

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { maxAge: _ignored, ...stateCookieOptions } = cookieOptions(OAUTH_STATE_MAX_AGE);

  const failRedirect = (reason: string) =>
    res.redirect(`${envConfig.APP_URL}/login?error=${encodeURIComponent(reason)}`);

  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const cookieState = req.cookies?.[OAUTH_STATE_COOKIE];

  res.clearCookie(OAUTH_STATE_COOKIE, stateCookieOptions);

  if (!code || !state || !cookieState || state !== cookieState) {
    return failRedirect('Google sign-in expired. Please try again.');
  }

  try {
    jwt.verify(state, envConfig.ACCESS_SECRET);
  } catch {
    return failRedirect('Google sign-in expired. Please try again.');
  }

  const googleAccessToken = await getGoogleTokens(code);
  const profile = await getGoogleProfile(googleAccessToken);

  if (!profile.email || !profile.verified_email) {
    return failRedirect('Your Google account email is not verified.');
  }

  const email = profile.email.trim().toLowerCase();

  let user = await prisma.user.findUnique({ where: { email } });

  if (user && user.authProvider !== AuthProvider.GOOGLE) {
    return failRedirect('An account with this email already exists. Sign in with your password.');
  }

  user ??= await prisma.user.create({
    data: {
      name: profile.name || email.split('@')[0] || 'User',
      email,
      authProvider: AuthProvider.GOOGLE,
    },
  });

  const { accessToken, refreshToken } = generateTokens(user.id);
  setCookies(res, accessToken, refreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return res.redirect(`${envConfig.APP_URL}/auth/google-callback`);
});
