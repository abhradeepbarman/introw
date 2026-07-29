import type { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import CustomErrorHandler from '../utils/custom-error-handler';
import { formatError } from '../utils/format-error';
import { logger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';

// Express detects error middleware by arity: all four params are required,
// even though `_next` is unused.
const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message: string = 'Internal server error';
  let data: object | null = null;

  if (err instanceof ZodError) {
    statusCode = 422;
    message = 'Validation Error';
    data = formatError(err);
  }

  if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Unauthorized';
  }

  if (err instanceof CustomErrorHandler) {
    statusCode = err.status;
    message = err.message;
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${statusCode}`, err);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${statusCode}: ${message}`);
  }

  res.status(statusCode).json(ResponseHandler(statusCode, message, data));
};

export default errorHandler;
