import type { AuthSession, AuthUser } from '@repo/common/types';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@repo/common/validations';
import envConfig from '../config/env';
import { apiGet, apiPost } from './api-client';

export const register = (payload: RegisterInput) => apiPost<AuthSession>('/auth/register', payload);

export const login = (payload: LoginInput) => apiPost<AuthSession>('/auth/login', payload);

export const logout = () => apiPost<{ id: string; name: string }>('/auth/logout', {});

export const getCurrentUser = () => apiGet<AuthUser>('/auth/me');

export const forgotPassword = (payload: ForgotPasswordInput) =>
  apiPost<null>('/auth/forgot-password', payload);

export const resetPassword = (token: string, payload: ResetPasswordInput) =>
  apiPost<null>(`/auth/reset-password/${encodeURIComponent(token)}`, payload);

export const googleLoginUrl = () => `${envConfig.API_BASE_URL}/auth/google`;
