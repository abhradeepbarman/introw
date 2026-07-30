import envConfig from '../config/env';

export type ApiFieldError = {
  field: string;
  message: string;
};

type ApiEnvelope = {
  status: number;
  message: string;
  data: unknown;
  success: boolean;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isEnvelope = (body: unknown): body is ApiEnvelope =>
  isRecord(body) &&
  typeof body.status === 'number' &&
  typeof body.message === 'string' &&
  typeof body.success === 'boolean' &&
  'data' in body;

const toFieldErrors = (data: unknown): ApiFieldError[] => {
  if (!Array.isArray(data)) return [];

  return data.flatMap((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.message !== 'string') return [];
    if (typeof entry.field !== 'string' && typeof entry.field !== 'number') return [];
    return [{ field: String(entry.field), message: entry.message }];
  });
};

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
    const message = isEnvelope(body) ? body.message : `Request failed (${response.status})`;
    const fieldErrors = isEnvelope(body) ? toFieldErrors(body.data) : [];
    throw new ApiError(response.status, message, fieldErrors);
  }

  return (isEnvelope(body) ? body.data : body) as T;
}

export const apiPost = <T>(path: string, payload: unknown) =>
  apiRequest<T>(path, { method: 'POST', body: JSON.stringify(payload) });

export const apiGet = <T>(path: string) => apiRequest<T>(path, { method: 'GET' });

export const apiDelete = <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' });

export const apiPut = <T>(path: string, payload: unknown) =>
  apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(payload) });
