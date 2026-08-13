export const AuthProvider = {
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE',
} as const;

export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  authProvider: AuthProvider;
};

export type AuthSession = AuthUser & {
  access_token: string;
};
