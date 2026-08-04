import { AppHeader, BackLink } from '@/components/app-header';
import { UserNav } from '@/components/auth/user-nav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { listInterviews } from '@/services/interview.service';
import { ArrowRight, Coins } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-5">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-mono text-xl tabular-nums">{value}</p>
    </div>
  );
}

const CreditsPage = () => {
  const { user } = useAuth();
  const [interviewsRun, setInterviewsRun] = useState<number | null>(null);

  useEffect(() => {
    listInterviews(1, 1)
      .then((response) => setInterviewsRun(response.total))
      .catch((cause: unknown) => console.error('Failed to load interview count:', cause));
  }, []);

  const credits = user?.credits ?? 0;
  const empty = credits === 0;

  return (
    <main className="min-h-dvh">
      <AppHeader right={<UserNav />} />

      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-2xl flex-col px-6">
        <BackLink to="/" label="Home" className="pt-6" />

        <div className="flex-1 pb-16 pt-6">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Credits</h1>

          <section className="mt-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-baseline justify-between px-6 py-4">
              <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
                Balance
              </h2>
              <Coins className="size-4 text-brand" />
            </div>

            <div className="px-6 pb-6">
              <p className="flex items-baseline gap-2">
                <span className="text-[clamp(2.75rem,9vw,4rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums">
                  {credits}
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  {credits === 1 ? 'credit' : 'credits'}
                </span>
              </p>

              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                One credit covers one interview end to end — the live call, the saved transcript,
                and the scored report you can download afterwards.
              </p>
            </div>

            <div className="grid divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <Stat
                label="Interviews run"
                value={interviewsRun === null ? '—' : `${interviewsRun}`}
              />
              <Stat label="Remaining" value={`${credits}`} />
            </div>

            <div className="border-t border-border px-6 py-6">
              <Button
                asChild
                className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
              >
                <Link to="/">
                  Start an interview
                  <ArrowRight className="size-4" />
                </Link>
              </Button>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                {empty
                  ? 'You are out of credits. Buying more is not self-serve yet.'
                  : 'Top-ups are not self-serve yet.'}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default CreditsPage;
