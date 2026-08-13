import type { AuthUser } from '@repo/common/types';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@repo/common/validations';
import envConfig from '../config/env';
import axiosInstance from '../lib/axios';
import type { ApiResponse } from '@/lib/api-error';

export const register = (payload: RegisterInput) =>
  axiosInstance.post<ApiResponse<AuthUser>>('/auth/register', payload).then((res) => res.data.data);

export const login = (payload: LoginInput) =>
  axiosInstance.post<ApiResponse<AuthUser>>('/auth/login', payload).then((res) => res.data.data);

export const logout = () =>
  axiosInstance
    .post<ApiResponse<{ id: string; name: string }>>('/auth/logout', {})
    .then((res) => res.data.data);

export const getCurrentUser = () =>
  axiosInstance.get<ApiResponse<AuthUser>>('/auth/me').then((res) => res.data.data);

export const forgotPassword = (payload: ForgotPasswordInput) =>
  axiosInstance
    .post<ApiResponse<null>>('/auth/forgot-password', payload)
    .then((res) => res.data.data);

export const resetPassword = (token: string, payload: ResetPasswordInput) =>
  axiosInstance
    .post<ApiResponse<null>>(`/auth/reset-password/${encodeURIComponent(token)}`, payload)
    .then((res) => res.data.data);

export const googleLoginUrl = () => `${envConfig.API_BASE_URL}/auth/google`;
