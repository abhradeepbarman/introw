import type { AuthProvider } from '@repo/common/types';

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        name: string;
        email: string;
        authProvider: AuthProvider;
        credits: number;
      };
    }
  }
}

export {};
