import { ApiError } from '@/services/api-client';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/**
 * Routes a failed request into the form: validation issues land on the field
 * they belong to, everything else becomes a form-level message.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: Path<T>[] = [],
) {
  if (!(error instanceof ApiError)) {
    setError('root', { message: 'Could not reach the server. Try again.' });
    return;
  }

  const matched = error.fieldErrors.filter((issue) => fields.includes(issue.field as Path<T>));

  if (matched.length === 0) {
    setError('root', { message: error.message });
    return;
  }

  matched.forEach((issue) => setError(issue.field as Path<T>, { message: issue.message }));
}
