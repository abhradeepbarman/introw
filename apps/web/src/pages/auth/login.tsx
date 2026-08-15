import { AuthDivider, GoogleButton } from '@/components/auth/google-button';
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
import { useAuth } from '@/contexts/auth-context';
import { applyApiError } from '@/utils/apply-api-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@repo/common/validations';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const { setError } = form;
  const oauthError = searchParams.get('error');

  useEffect(() => {
    if (oauthError) setError('root', { message: oauthError });
  }, [oauthError, setError]);

  const onSubmit = async (values: LoginInput) => {
    form.clearErrors('root');

    try {
      await login(values);
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      navigate(from ?? '/', { replace: true });
    } catch (error) {
      applyApiError(error, form.setError, ['email', 'password']);
    }
  };

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back."
      subtitle="Sign in to start an interview and pick up your past results."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        <GoogleButton label="Continue with Google" />
        <AuthDivider />

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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <div className="flex items-baseline justify-between">
                    <FormLabel className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">
                      Password
                    </FormLabel>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-brand hover:underline"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
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
                {form.formState.isSubmitting ? 'Signing in' : 'Sign in'}
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
      </div>
    </AuthShell>
  );
};

export default LoginPage;
