import type { AxiosError } from 'axios';

export type ApiFieldError = {
  field: string | number;
  message: string;
};

export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data: T;
  success: boolean;
}

export class ApiError extends Error {
  status: number;
  data: ApiFieldError[] | null;

  constructor(status: number, message: string, data: ApiFieldError[] | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const toApiError = (error: AxiosError): ApiError => {
  const body = error.response?.data as ApiResponse | undefined;

  if (!body) {
    return new ApiError(error.response?.status ?? 0, error.message || 'Something went wrong');
  }

  const data = Array.isArray(body.data) ? (body.data as ApiFieldError[]) : null;

  return new ApiError(body.status, body.message, data);
};
