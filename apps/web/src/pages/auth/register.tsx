import { AuthShell } from '@/components/auth/auth-shell';
import { AuthDivider, GoogleButton } from '@/components/auth/google-button';
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
import { registerSchema, type RegisterInput } from '@repo/common/validations';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: RegisterInput) => {
    form.clearErrors('root');

    try {
      await register(values);
      navigate('/', { replace: true });
    } catch (error) {
      applyApiError(error, form.setError, ['name', 'email', 'password']);
    }
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start interviewing."
      subtitle="One account keeps your interviews and results in one place."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        <GoogleButton label="Sign up with Google" />
        <AuthDivider />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormLabel className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">
                    Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="name"
                      placeholder="Ada Lovelace"
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormLabel className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">
                    Password
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
                {form.formState.isSubmitting ? 'Creating account' : 'Create account'}
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

export default RegisterPage;
