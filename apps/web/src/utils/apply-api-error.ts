import { ApiError } from '@/lib/api-error';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: Path<T>[] = [],
) {
  if (!(error instanceof ApiError)) {
    setError('root', { message: 'Could not reach the server. Try again.' });
    return;
  }

  const matched = (error.data ?? []).filter((issue) => fields.includes(issue.field as Path<T>));

  if (matched.length === 0) {
    setError('root', {
      message:
        error.status >= 500
          ? 'Something went wrong on our end. Try again in a moment.'
          : error.message,
    });
    return;
  }

  matched.forEach((issue) => setError(issue.field as Path<T>, { message: issue.message }));
}
