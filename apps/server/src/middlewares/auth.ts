import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import envConfig from '../config/env';
import { ACCESS_TOKEN_COOKIE } from '../constants';
import { prisma } from '@repo/db';
import asyncHandler from '../utils/async-handler';
import CustomErrorHandler from '../utils/custom-error-handler';

const readToken = (req: Request) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
};

const auth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = readToken(req);
  if (!token) {
    return next(CustomErrorHandler.unAuthorized());
  }

  const decoded = jwt.verify(token, envConfig.ACCESS_SECRET) as JwtPayload;
  if (!decoded?.id) {
    return next(CustomErrorHandler.unAuthorized());
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      name: true,
      email: true,
      authProvider: true,
      credits: true,
    },
  });

  if (!user) {
    return next(CustomErrorHandler.unAuthorized());
  }

  req.user = user;
  return next();
});

export default auth;
