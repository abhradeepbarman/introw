import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { envConfig } from '../config';
import { ACCESS_TOKEN_COOKIE } from '../constants';
import { prisma } from '@repo/db';
import { asyncHandler, CustomErrorHandler } from '../utils';

const auth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;

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
    },
  });

  if (!user) {
    return next(CustomErrorHandler.unAuthorized());
  }

  req.user = user;
  return next();
});

export default auth;
