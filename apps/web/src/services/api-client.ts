import envConfig from '../config/env';

export type ApiFieldError = {
  field: string;
  message: string;
};

type ApiErrorBody = {
  status: number;
  message: string;
  data: ApiFieldError[] | null;
};

export class ApiError extends Error {
  status: number;
  fieldErrors: ApiFieldError[];

  constructor(status: number, message: string, fieldErrors: ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const isErrorBody = (body: unknown): body is ApiErrorBody =>
  typeof body === 'object' && body !== null && 'message' in body;

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${envConfig.API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = isErrorBody(body) ? body.message : `Request failed (${response.status})`;
    const fieldErrors = isErrorBody(body) && Array.isArray(body.data) ? body.data : [];
    throw new ApiError(response.status, message, fieldErrors);
  }

  return body as T;
}

export const apiPost = <T>(path: string, payload: unknown) =>
  apiRequest<T>(path, { method: 'POST', body: JSON.stringify(payload) });

export const apiGet = <T>(path: string) => apiRequest<T>(path, { method: 'GET' });

export const apiDelete = <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' });

export const apiPut = <T>(path: string, payload: unknown) =>
  apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(payload) });
