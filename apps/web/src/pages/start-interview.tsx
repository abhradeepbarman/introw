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
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import { startPreInterview } from '@/services/interview.service';
import {
  githubUrlSchema,
  interviewSourcesSchema,
  type InterviewSources,
} from '@repo/common/validations';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Github } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';

type SourceRowProps = {
  icon: LucideIcon;
  iconClassName: string;
  ready: boolean;
  children: ReactNode;
};

/**
 * One source on the intake rail: a marker that keeps the source's own colour,
 * and a status that flips once the URL parses as a real profile.
 */
function SourceRow({ icon: Icon, iconClassName, ready, children }: SourceRowProps) {
  return (
    <div className="relative pl-11">
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-0 flex size-7 items-center justify-center rounded-md border bg-card transition-colors duration-300',
          ready ? 'border-brand ring-3 ring-brand-wash' : 'border-border',
        )}
      >
        <Icon className={cn('size-3.5', iconClassName)} />
      </span>
      {children}
    </div>
  );
}

const StartInterviewPage = () => {
  const form = useForm<InterviewSources>({
    resolver: zodResolver(interviewSourcesSchema),
    mode: 'onChange',
    defaultValues: { githubUrl: '' },
  });

  const values = form.watch();
  const githubReady = githubUrlSchema.safeParse(values.githubUrl).success;

  const onSubmit = async (sources: InterviewSources) => {
    form.clearErrors('root');

    try {
      const { id } = await startPreInterview(sources);
      console.info('pre-interview', id);
    } catch (error) {
      if (error instanceof ApiError) {
        // A 422 names the offending field, so show it on the input itself.
        const fieldError = error.fieldErrors.find((issue) => issue.field === 'githubUrl');
        if (fieldError) {
          form.setError('githubUrl', { message: fieldError.message });
          return;
        }
        form.setError('root', { message: error.message });
        return;
      }

      form.setError('root', { message: 'Could not reach the server. Try again.' });
    }
  };

  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-6">
        <header className="flex items-center justify-between py-6">
          <span className="text-sm font-semibold tracking-tight">intervue</span>
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
            Session setup
          </span>
        </header>

        <div className="grid flex-1 items-center gap-14 pb-16 pt-6 lg:grid-cols-[1.05fr_minmax(0,25rem)] lg:gap-20 lg:pb-24">
          <section>
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-brand">
              AI technical interview
            </p>
            <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
              Your résumé tells one story.
              <span className="block text-muted-foreground">Your commits tell another.</span>
            </h1>
            <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
              Intervue reads what you actually shipped, then asks the questions that live in the
              code. One link to begin.
            </p>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-baseline justify-between px-6 py-4">
              <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
                Source
              </h2>
              <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
                {Number(githubReady)} of 1 linked
              </span>
            </div>

            <div className="h-0.5 bg-muted" role="presentation">
              <div
                className="h-full bg-brand transition-[width] duration-500 ease-out"
                style={{ width: `${Number(githubReady) * 100}%` }}
              />
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7 px-6 py-7">
                <FormField
                  control={form.control}
                  name="githubUrl"
                  render={({ field }) => (
                    <SourceRow icon={Github} iconClassName="text-source-github" ready={githubReady}>
                      <FormItem className="gap-2">
                        <div className="flex items-baseline justify-between">
                          <FormLabel className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">
                            GitHub
                          </FormLabel>
                          <span
                            className={cn(
                              'font-mono text-[0.625rem] uppercase tracking-[0.16em] transition-colors',
                              githubReady ? 'text-brand' : 'text-muted-foreground/70',
                            )}
                          >
                            {githubReady ? 'Linked' : 'Awaiting'}
                          </span>
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            type="url"
                            inputMode="url"
                            autoComplete="url"
                            spellCheck={false}
                            placeholder="https://github.com/your-handle"
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </SourceRow>
                  )}
                />

                <div className="space-y-3 pt-1">
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
                  >
                    {form.formState.isSubmitting ? 'Starting' : 'Start interview'}
                    <ArrowRight className="size-4" />
                  </Button>
                  <p
                    className={cn(
                      'text-center text-xs',
                      form.formState.errors.root ? 'text-destructive' : 'text-muted-foreground',
                    )}
                    role={form.formState.errors.root ? 'alert' : undefined}
                  >
                    {form.formState.errors.root?.message ??
                      'Your link should point to a public profile.'}
                  </p>
                </div>
              </form>
            </Form>
          </section>
        </div>
      </div>
    </main>
  );
};

export default StartInterviewPage;
