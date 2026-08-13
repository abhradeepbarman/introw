import { AppHeader, BackLink } from '@/components/common/app-header';
import { UserNav } from '@/components/common/user-nav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-error';
import {
  downloadReport,
  downloadTranscript,
  listInterviews,
  type InterviewSummary,
} from '@/services/interview.service';
import type { Paginated } from '@repo/common/validations';
import { ArrowRight, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const STATUS_LABEL: Record<InterviewSummary['status'], string> = {
  PENDING: 'Not started',
  IN_PROGRESS: 'Unfinished',
  COMPLETED: 'Scored',
};

const bandFor = (score: number) => {
  if (score >= 75) return 'Strong';
  if (score >= 50) return 'Promising';
  return 'Needs work';
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const ROW_ACTION =
  'flex h-12 items-center justify-center gap-2 label-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4';

function InterviewRow({ interview }: { interview: InterviewSummary }) {
  const [busy, setBusy] = useState<'report' | 'transcript' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: 'report' | 'transcript') => {
    setBusy(kind);
    setError(null);

    try {
      await (kind === 'report' ? downloadReport(interview.id) : downloadTranscript(interview.id));
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not download the file. Try again.',
      );
    } finally {
      setBusy(null);
    }
  };

  const hasTranscript = interview.messageCount > 0;

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-40px_hsl(196_44%_8%/0.4)]">
      <div className="flex items-start justify-between gap-4 px-6 py-5">
        <div className="min-w-0 space-y-2">
          <p className="label-mono text-muted-foreground">{formatDate(interview.createdAt)}</p>
          <p className="text-sm text-muted-foreground">
            {STATUS_LABEL[interview.status]} · {interview.messageCount} lines
          </p>
        </div>

        {interview.hasReport ? (
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl font-bold tabular-nums leading-none tracking-[-0.03em]">
              {interview.score}
              <span className="font-mono text-sm font-normal text-muted-foreground"> / 100</span>
            </p>
            <p className="mt-2 label-mono text-brand">{bandFor(interview.score)}</p>
          </div>
        ) : (
          <p className="shrink-0 label-mono text-muted-foreground">Not scored</p>
        )}
      </div>

      <div className="grid divide-y divide-border border-t border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Link to={`/interview/${interview.id}/result`} className={ROW_ACTION}>
          <FileText />
          View report
        </Link>

        <button
          type="button"
          onClick={() => run('report')}
          disabled={busy !== null || !interview.hasReport}
          className={ROW_ACTION}
        >
          <Download />
          {busy === 'report' ? 'Preparing' : 'Report'}
        </button>

        <button
          type="button"
          onClick={() => run('transcript')}
          disabled={busy !== null || !hasTranscript}
          className={ROW_ACTION}
        >
          <Download />
          {busy === 'transcript' ? 'Preparing' : 'Transcript'}
        </button>
      </div>

      {error && (
        <p
          className="border-t border-border px-5 py-3 text-center text-xs text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </li>
  );
}

const PAGE_BUTTON =
  'grid size-8 place-items-center rounded-md font-mono text-[0.6875rem] tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-40';

function Pagination({
  result,
  onChange,
}: {
  result: Paginated<InterviewSummary>;
  onChange: (page: number) => void;
}) {
  const { page, totalPages, total, limit } = result;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  const windowSize = Math.min(5, totalPages);
  const windowStart = Math.min(Math.max(1, page - 2), Math.max(1, totalPages - windowSize + 1));
  const pages = Array.from({ length: windowSize }, (_, index) => windowStart + index);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row"
    >
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">
        {first}–{last} of {total}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={cn(PAGE_BUTTON, 'text-muted-foreground hover:bg-muted hover:text-foreground')}
        >
          <ChevronLeft className="size-4" />
        </button>

        {pages.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              PAGE_BUTTON,
              entry === page
                ? 'bg-brand text-brand-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {entry}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className={cn(PAGE_BUTTON, 'text-muted-foreground hover:bg-muted hover:text-foreground')}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <p className="font-display text-xl font-semibold tracking-[-0.015em]">No interviews yet.</p>
      <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
        Finish one and the report will collect here, with the transcript alongside it.
      </p>
      <Button
        asChild
        className="mt-6 bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
      >
        <Link to="/">
          Start an interview
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </section>
  );
}

function LoadingRows() {
  return (
    <ul className="space-y-4" aria-hidden>
      {[0, 1, 2].map((row) => (
        <li key={row} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="space-y-2.5 px-5 py-4">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-muted [animation-delay:150ms]" />
          </div>
          <div className="h-11 border-t border-border" />
        </li>
      ))}
    </ul>
  );
}

const InterviewHistoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [result, setResult] = useState<Paginated<InterviewSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goToPage = (next: number) => {
    setSearchParams({ page: String(next) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    listInterviews(page)
      .then((response) => {
        if (!active) return;
        setResult(response);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        console.error('Failed to load interviews:', cause);
        setError(
          cause instanceof ApiError
            ? cause.message
            : 'Could not load your interviews. Check your connection and try again.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page]);

  useEffect(() => {
    if (result && page > result.totalPages) {
      setSearchParams({ page: String(result.totalPages) }, { replace: true });
    }
  }, [result, page, setSearchParams]);

  return (
    <main className="min-h-dvh">
      <AppHeader right={<UserNav />} />

      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col px-6">
        <BackLink to="/" label="Home" className="pt-6" />

        <div className="flex-1 pb-16 pt-6">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-bold tracking-[-0.03em]">
              Past interviews
            </h1>
            {result && result.total > 0 && (
              <span className="label-mono text-muted-foreground">{result.total} total</span>
            )}
          </div>

          <div className="mt-8">
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : loading ? (
              <LoadingRows />
            ) : !result || result.items.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <ul className="space-y-4">
                  {result.items.map((interview) => (
                    <InterviewRow key={interview.id} interview={interview} />
                  ))}
                </ul>

                {result.totalPages > 1 && <Pagination result={result} onChange={goToPage} />}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default InterviewHistoryPage;
