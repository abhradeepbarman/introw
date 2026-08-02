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
import { applyApiError } from '@/lib/form-errors';
import { forgotPassword } from '@/services/auth.service';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@repo/common/validations';
import { ArrowRight, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    form.clearErrors('root');

    try {
      await forgotPassword(values);
      setSentTo(values.email);
    } catch (error) {
      applyApiError(error, form.setError, ['email']);
    }
  };

  if (sentTo) {
    return (
      <AuthShell
        eyebrow="Reset password"
        title="Check your inbox."
        subtitle={`If an account exists for ${sentTo}, a reset link is on its way. It expires in one hour.`}
        footer={
          <Link to="/login" className="font-medium text-brand hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="flex items-center gap-3 rounded-lg border border-border bg-brand-wash px-4 py-3">
          <MailCheck className="size-4 shrink-0 text-brand" />
          <p className="text-sm text-muted-foreground">
            Nothing yet? Check spam, or try again in a few minutes.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Forgot your password?"
      subtitle="Enter the email on your account and we'll send you a reset link."
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
            name="email"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    placeholder="you@example.com"
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
              {form.formState.isSubmitting ? 'Sending' : 'Send reset link'}
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

export default ForgotPasswordPage;
