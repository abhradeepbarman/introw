import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api-error';
import { resetPassword } from '@/services/auth.service';
import { applyApiError } from '@/utils/apply-api-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@repo/common/validations';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';

const ResetPasswordPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [deadLink, setDeadLink] = useState<string | null>(null);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = async (values: ResetPasswordInput) => {
    if (!token) return;
    form.clearErrors('root');

    try {
      await resetPassword(token, values);
      setDone(true);
      navigate('/login', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setDeadLink(error.message);
        return;
      }
      applyApiError(error, form.setError, ['password']);
    }
  };

  const linkProblem = token ? deadLink : 'This link is incomplete';

  if (linkProblem) {
    return (
      <AuthShell
        eyebrow="Reset password"
        title="This link won't work."
        subtitle={`${linkProblem}. Request a fresh link and try again.`}
        footer={
          <Link to="/forgot-password" className="font-medium text-brand hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Reset links are single-use and expire one hour after they are sent.
        </p>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        eyebrow="Reset password"
        title="Password updated."
        subtitle="Taking you to sign in with your new password."
      >
        <div className="h-0.5 overflow-hidden rounded bg-muted" role="presentation">
          <div className="h-full w-1/4 animate-sweep bg-brand" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Choose a new password."
      subtitle="Setting a new password signs you out everywhere else."
      footer={
        <Link to="/login" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">
                  New password
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3 pt-1">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
            >
              {form.formState.isSubmitting ? 'Updating' : 'Update password'}
              <ArrowRight className="size-4" />
            </Button>
            {form.formState.errors.root ? (
              <p className="text-center text-xs text-destructive" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}
          </div>
        </form>
      </Form>
    </AuthShell>
  );
};

export default ResetPasswordPage;
