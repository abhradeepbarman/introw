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

const REFRESH_PATH = '/auth/refresh';

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Access tokens are short-lived, so a 401 is usually just an expired cookie.
 * Concurrent callers share one refresh so a page load does not fire several.
 */
const refreshSession = () => {
  refreshInFlight ??= fetch(`${envConfig.API_BASE_URL}${REFRESH_PATH}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
};

const send = (path: string, init?: RequestInit) =>
  fetch(`${envConfig.API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await send(path, init);

  if (response.status === 401 && path !== REFRESH_PATH && (await refreshSession())) {
    response = await send(path, init);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = isEnvelope(body) ? body.message : `Request failed (${response.status})`;
    const fieldErrors = isEnvelope(body) ? toFieldErrors(body.data) : [];
    throw new ApiError(response.status, message, fieldErrors);
  }

  return (isEnvelope(body) ? body.data : body) as T;
}

const filenameFrom = (disposition: string | null) =>
  disposition?.match(/filename="?([^";]+)"?/i)?.[1];

export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  let response = await send(path, { method: 'GET' });

  if (response.status === 401 && (await refreshSession())) {
    response = await send(path, { method: 'GET' });
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = isEnvelope(body) ? body.message : `Download failed (${response.status})`;
    throw new ApiError(response.status, message);
  }

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filenameFrom(response.headers.get('Content-Disposition')) ?? fallbackName;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const apiPost = <T>(path: string, payload: unknown) =>
  apiRequest<T>(path, { method: 'POST', body: JSON.stringify(payload) });

export const apiGet = <T>(path: string) => apiRequest<T>(path, { method: 'GET' });

export const apiDelete = <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' });

export const apiPut = <T>(path: string, payload: unknown) =>
  apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(payload) });
