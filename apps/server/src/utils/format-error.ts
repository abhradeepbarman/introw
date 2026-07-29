import { ZodError } from 'zod';

export const formatError = (error: ZodError) => {
  const formatted = error.issues.map((issue) => {
    return {
      field: issue.path[0],
      message: issue.message,
    };
  });
  return formatted;
};
