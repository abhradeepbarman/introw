import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler so a rejected promise is forwarded to the
 * error-handling middleware instead of becoming an unhandled rejection.
 */
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
