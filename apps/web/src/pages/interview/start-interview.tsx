import { AppHeader } from '@/components/common/app-header';
import { Brand } from '@/components/common/brand';
import { UserNav } from '@/components/common/user-nav';
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
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-error';
import { createInterview } from '@/services/interview.service';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  GITHUB_PROFILE,
  interviewSourcesSchema,
  RESUME_MAX_BYTES,
  RESUME_MIME_TYPE,
  type InterviewSources,
} from '@repo/common/validations';
import {
  ArrowRight,
  FileText,
  Github,
  Mic,
  ScrollText,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const EXCHANGES = [
  {
    repo: 'ledger-api',
    hash: 'a3f9c21',
    message: 'refactor: replace status polling with server-sent events',
    question:
      'You swapped polling for SSE here. What happens to a client that reconnects mid-stream — where does it pick the feed back up?',
  },
  {
    repo: 'search-ui',
    hash: '7b12e04',
    message: 'fix: debounce the search input to cut redundant requests',
    question:
      'Debouncing cut your request volume. How did you land on 300ms, and what starts to break at 50ms?',
  },
  {
    repo: 'checkout',
    hash: 'e5d0a9f',
    message: 'feat: apply optimistic updates to the cart',
    question:
      'Optimistic updates need a way back. Walk me through what the cart does when the server rejects the write.',
  },
];

const STEPS = [
  {
    icon: Github,
    title: 'Point us at your work',
    body: 'We read your public repositories — languages, structure, and what you shipped recently — and your résumé if you attach one.',
  },
  {
    icon: Mic,
    title: 'Talk it through',
    body: 'A voice interviewer asks about your own code and follows up on the answers you give. No multiple choice.',
  },
  {
    icon: ScrollText,
    title: 'Read the verdict',
    body: 'Three scored dimensions, quotes pulled from your answers as evidence, and a report you can download.',
  },
];

function CommitExchange() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((current) => (current + 1) % EXCHANGES.length), 6500);
    return () => clearInterval(timer);
  }, [active]);

  const exchange = EXCHANGES[active]!;

  return (
    <section className="overflow-hidden rounded-2xl bg-ink text-ink-foreground shadow-[0_30px_80px_-40px_hsl(196_44%_8%/0.55)]">
      <div className="flex items-center justify-between gap-4 border-b border-ink-border px-5 py-3.5 sm:px-7">
        <p className="label-mono text-ink-muted">Commit to question</p>
        <p className="flex items-center gap-2 font-mono text-xs text-ink-muted">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-brand-light" />
          live sample
        </p>
      </div>

      <div key={active} className="animate-rise px-5 py-7 sm:px-7 sm:py-9">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-sm">
          <span className="rounded-md bg-ink-raised px-2 py-1 text-brand-light">
            {exchange.repo}
          </span>
          <span className="text-ink-muted">{exchange.hash}</span>
          <span className="text-ink-foreground/90">{exchange.message}</span>
        </p>

        <div className="mt-7 border-l-2 border-brand-light/50 pl-5 sm:pl-6">
          <p className="label-mono text-brand-light">Interviewer asks</p>
          <p className="mt-3 max-w-2xl font-display text-xl leading-snug tracking-[-0.01em] sm:text-[1.65rem]">
            {exchange.question}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 pb-6 sm:px-7">
        {EXCHANGES.map((item, index) => (
          <button
            key={item.hash}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Show the ${item.repo} example`}
            aria-current={index === active}
            className={cn(
              'h-1 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-brand-light/60',
              index === active ? 'w-8 bg-brand-light' : 'w-4 bg-ink-border hover:bg-ink-muted',
            )}
          />
        ))}
      </div>
    </section>
  );
}

const StartInterviewPage = () => {
  const form = useForm<InterviewSources>({
    resolver: zodResolver(interviewSourcesSchema),
    mode: 'onChange',
    defaultValues: { githubUrl: '' },
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const values = form.watch();
  const githubReady = GITHUB_PROFILE.test(values.githubUrl?.trim() ?? '');
  const hasSource = githubReady || Boolean(resume);

  const onResumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    if (file.type !== RESUME_MIME_TYPE) {
      setResume(null);
      setResumeError('Your résumé has to be a PDF.');
      return;
    }

    if (file.size > RESUME_MAX_BYTES) {
      setResume(null);
      setResumeError(`Keep your résumé under ${RESUME_MAX_BYTES / 1024 / 1024}MB.`);
      return;
    }

    setResume(file);
    setResumeError(null);
  };

  const onSubmit = async (sources: InterviewSources) => {
    form.clearErrors('root');

    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }

    try {
      const { id } = await createInterview(sources, resume);
      navigate(`/interview/${id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldError = error.data?.find((issue) => issue.field === 'githubUrl');
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
      <AppHeader right={<UserNav />} />

      <div className="mx-auto w-full max-w-6xl px-6">
        <section className="grid items-center gap-12 pb-14 pt-12 lg:grid-cols-[1.1fr_minmax(0,26rem)] lg:gap-16 lg:pb-20 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-wash px-3 py-1.5 label-mono text-brand">
              <span className="size-1.5 rounded-full bg-brand" />
              AI voice interview
            </p>

            <h1 className="mt-7 font-display text-[clamp(2.75rem,6.4vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.035em]">
              Your résumé tells one story.
              <span className="mt-1 block text-muted-foreground">Your commits tell another.</span>
            </h1>

            <p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Point Intervue at your work — your GitHub, your résumé, or both — and it interviews
              you on what is actually there. Out loud, with follow-ups, and a scored report at the
              end.
            </p>

            <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-5 border-t border-border pt-7">
              <div>
                <dt className="label-mono text-muted-foreground">Sources</dt>
                <dd className="mt-1.5 text-base font-medium">GitHub, résumé, or both</dd>
              </div>
              <div>
                <dt className="label-mono text-muted-foreground">Format</dt>
                <dd className="mt-1.5 text-base font-medium">Spoken, in real time</dd>
              </div>
              <div>
                <dt className="label-mono text-muted-foreground">Result</dt>
                <dd className="mt-1.5 text-base font-medium">Scored report and transcript</dd>
              </div>
            </dl>
          </div>

          <div>
            <section
              id="source"
              className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_28px_70px_-42px_hsl(196_44%_8%/0.45)]"
            >
              <div className="flex items-baseline justify-between gap-4 px-6 pt-6">
                <h2 className="label-mono text-muted-foreground">What we interview from</h2>
                <p className="text-sm text-muted-foreground">Either one is enough</p>
              </div>

              <div className="mt-5 h-1 bg-muted" role="presentation">
                <div
                  className="h-full bg-brand transition-[width] duration-500 ease-out"
                  style={{ width: `${Number(hasSource) * 100}%` }}
                />
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-6 py-7">
                  <FormField
                    control={form.control}
                    name="githubUrl"
                    render={({ field }) => (
                      <FormItem className="gap-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <FormLabel className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <span
                              aria-hidden
                              className={cn(
                                'grid size-7 place-items-center rounded-md border transition-colors duration-300',
                                githubReady
                                  ? 'border-brand/40 bg-brand-wash'
                                  : 'border-border bg-secondary',
                              )}
                            >
                              <Github className="size-3.5 text-source-github" />
                            </span>
                            GitHub profile
                          </FormLabel>
                          <span
                            className={cn(
                              'font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors',
                              githubReady ? 'text-brand' : 'text-muted-foreground',
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
                            className="h-12 rounded-lg text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span
                          aria-hidden
                          className={cn(
                            'grid size-7 place-items-center rounded-md border transition-colors duration-300',
                            resume ? 'border-brand/40 bg-brand-wash' : 'border-border bg-secondary',
                          )}
                        >
                          <FileText
                            className={cn(
                              'size-3.5',
                              resume ? 'text-brand' : 'text-muted-foreground',
                            )}
                          />
                        </span>
                        Résumé
                      </p>
                      <span
                        className={cn(
                          'font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors',
                          resume ? 'text-brand' : 'text-muted-foreground',
                        )}
                      >
                        {resume ? 'Attached' : 'Awaiting'}
                      </span>
                    </div>

                    {resume ? (
                      <div className="flex items-center gap-3 rounded-lg border border-brand/30 bg-brand-wash px-4 py-3">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {resume.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setResume(null)}
                          aria-label={`Remove ${resume.name}`}
                          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-secondary/50 px-4 py-3.5 transition-colors hover:border-brand/40 hover:bg-brand-wash/40 focus-within:ring-2 focus-within:ring-brand/40">
                        <Upload className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm leading-relaxed text-muted-foreground">
                          Attach a PDF and the interviewer will press on what it claims, not just
                          what you pushed.
                        </span>
                        <input
                          type="file"
                          accept={RESUME_MIME_TYPE}
                          onChange={onResumeChange}
                          className="sr-only"
                        />
                      </label>
                    )}

                    {resumeError && (
                      <p className="text-sm text-destructive" role="alert">
                        {resumeError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting || (Boolean(user) && !hasSource)}
                      className="h-12 w-full rounded-lg bg-brand text-[0.9375rem] font-semibold text-brand-foreground shadow-sm transition-transform hover:bg-brand-hover focus-visible:ring-brand/40 active:scale-[0.99]"
                    >
                      {form.formState.isSubmitting
                        ? 'Starting'
                        : user
                          ? 'Start interview'
                          : 'Sign in to start'}
                      <ArrowRight className="size-4" />
                    </Button>
                    <p
                      className={cn(
                        'text-center text-sm',
                        form.formState.errors.root ? 'text-destructive' : 'text-muted-foreground',
                      )}
                      role={form.formState.errors.root ? 'alert' : undefined}
                    >
                      {form.formState.errors.root?.message ??
                        (hasSource
                          ? 'Your link should point to a public profile.'
                          : 'Link a GitHub profile or attach a résumé to start.')}
                    </p>
                  </div>
                </form>
              </Form>
            </section>

            <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-brand" />
              We only read public repositories.
            </p>
          </div>
        </section>

        <CommitExchange />

        <section className="py-16 lg:py-24">
          <h2 className="max-w-xl font-display text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-tight tracking-tight">
            Three steps, start to scored.
          </h2>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <div key={title} className="bg-card px-6 py-8 lg:px-8 lg:py-10">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-wash text-brand">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-2xl tabular-nums text-border">0{index + 1}</span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold tracking-[-0.015em]">
                  {title}
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-start justify-between gap-6 border-t border-border py-14 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">
              Ready to defend your code?
            </h2>
            <p className="mt-2 text-muted-foreground">
              One link is all the setup there is. The interview starts when you do.
            </p>
          </div>
          <Button
            asChild
            className="h-12 shrink-0 rounded-lg bg-brand px-6 text-[0.9375rem] font-semibold text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
          >
            <a href="#source">
              Link your GitHub
              <ArrowRight className="size-4" />
            </a>
          </Button>
        </section>
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Brand />
          <Link
            to="/interviews"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
          >
            Past interviews
          </Link>
        </div>
      </footer>
    </main>
  );
};

export default StartInterviewPage;
