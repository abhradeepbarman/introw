import { Button } from '@/components/ui/button';
import { ApiError } from '@/services/api-client';
import { getInterviewResult, type InterviewResult } from '@/services/interview.service';
import { DIMENSION_KEYS, DIMENSIONS, type Dimension, type Rubric } from '@repo/common/validations';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const SCORE_HEIGHT = 'h-[clamp(2.75rem,9vw,4rem)]';

const bandFor = (score: number) => {
  if (score >= 75) return 'Strong';
  if (score >= 50) return 'Promising';
  return 'Needs work';
};

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">
    {children}
  </h2>
);

function Points({ title, items, accent }: { title: string; items: string[]; accent: boolean }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h4 className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed">
            <span
              aria-hidden
              className={`mt-2 size-1 shrink-0 rounded-full ${accent ? 'bg-brand' : 'bg-muted-foreground'}`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DimensionRow({
  dimension,
  label,
  blurb,
}: {
  dimension: Dimension;
  label: string;
  blurb: string;
}) {
  const { assessed, score, summary, evidence, strengths, improvements } = dimension;

  return (
    <li className="space-y-3 py-5 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">{label}</h3>
          <p className="text-xs text-muted-foreground">{blurb}</p>
        </div>
        {assessed ? (
          <p className="shrink-0 font-mono text-sm tabular-nums">
            {score}
            <span className="text-muted-foreground"> / 100</span>
          </p>
        ) : (
          <p className="shrink-0 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">
            Not assessed
          </p>
        )}
      </div>

      <div className="h-px bg-muted" role="presentation">
        {assessed && (
          <div
            className="h-full bg-brand transition-[width] duration-700 ease-out"
            style={{ width: `${score}%` }}
          />
        )}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>

      {evidence.length > 0 && (
        <ul className="space-y-2">
          {evidence.map((quote) => (
            <li
              key={quote}
              className="border-l-2 border-border pl-3 text-sm italic leading-relaxed text-muted-foreground"
            >
              “{quote}”
            </li>
          ))}
        </ul>
      )}

      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="grid gap-4 pt-1 sm:grid-cols-2">
          <Points title="Did well" items={strengths} accent />
          <Points title="Work on" items={improvements} accent={false} />
        </div>
      )}
    </li>
  );
}

function Breakdown({ rubric }: { rubric: Rubric }) {
  return (
    <div className="space-y-3">
      <SectionLabel>Breakdown</SectionLabel>
      <ul className="divide-y divide-border">
        {DIMENSION_KEYS.map((key) => (
          <DimensionRow
            key={key}
            dimension={rubric[key]}
            label={DIMENSIONS[key].label}
            blurb={DIMENSIONS[key].blurb}
          />
        ))}
      </ul>
    </div>
  );
}

function ResultCard({ status, children }: { status: string; children: ReactNode }) {
  return (
    <section className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-baseline justify-between px-6 py-4">
        <h1 className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
          Score
        </h1>
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-brand">
          {status}
        </span>
      </div>
      {children}
    </section>
  );
}

function PendingResult() {
  return (
    <ResultCard status="Reviewing">
      <div className="px-6 pb-5">
        <div className={`flex items-center ${SCORE_HEIGHT}`}>
          <div className="h-12 w-28 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <div className="h-0.5 overflow-hidden bg-muted" role="presentation">
        <div className="h-full w-1/4 animate-sweep bg-brand" />
      </div>

      <div className="space-y-6 px-6 py-7">
        <div className="space-y-3">
          <SectionLabel>Breakdown</SectionLabel>
          <ul className="divide-y divide-border" aria-hidden>
            {DIMENSION_KEYS.map((key) => (
              <li key={key} className="space-y-2.5 py-4 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-px bg-muted" />
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <SectionLabel>Feedback</SectionLabel>
          <div className="space-y-2.5" aria-hidden>
            <div className="h-3 animate-pulse rounded bg-muted" />
            <div className="h-3 animate-pulse rounded bg-muted [animation-delay:150ms]" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-muted [animation-delay:300ms]" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-muted [animation-delay:450ms]" />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground" role="status">
          Reading the transcript and scoring your interview
        </p>
      </div>
    </ResultCard>
  );
}

function ScoredResult({ result, onRestart }: { result: InterviewResult; onRestart: () => void }) {
  return (
    <ResultCard status={bandFor(result.score)}>
      <div className="px-6 pb-5">
        <p className={`flex items-baseline gap-1.5 ${SCORE_HEIGHT}`}>
          <span className="text-[clamp(2.75rem,9vw,4rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums">
            {result.score}
          </span>
          <span className="font-mono text-sm text-muted-foreground">/ 100</span>
        </p>
      </div>

      <div className="h-0.5 bg-muted" role="presentation">
        <div
          className="h-full bg-brand transition-[width] duration-700 ease-out"
          style={{ width: `${result.score}%` }}
        />
      </div>

      <div className="space-y-8 px-6 py-7">
        {result.rubric && <Breakdown rubric={result.rubric} />}

        <div className="space-y-3">
          <SectionLabel>Feedback</SectionLabel>
          <p className="whitespace-pre-line leading-relaxed">{result.feedback}</p>
        </div>

        <Button
          type="button"
          onClick={onRestart}
          className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
        >
          Start another interview
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </ResultCard>
  );
}

const InterviewResultPage = () => {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!interviewId || requestedRef.current) return;
    requestedRef.current = true;

    getInterviewResult(interviewId)
      .then(setResult)
      .catch((cause: unknown) => {
        console.error('Failed to load interview result:', cause);
        setError(
          cause instanceof ApiError
            ? cause.message
            : 'Could not load your result. Check your connection and try again.',
        );
      });
  }, [interviewId]);

  const goHome = () => navigate('/');

  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6">
        <header className="flex items-center justify-between py-6">
          <span className="text-sm font-semibold tracking-tight">intervue</span>
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
            Result
          </span>
        </header>

        <div className="flex flex-1 items-center pb-16">
          {error ? (
            <section className="w-full text-center">
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
              <Button
                type="button"
                onClick={goHome}
                className="mt-6 bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
              >
                Back to start
              </Button>
            </section>
          ) : result ? (
            <ScoredResult result={result} onRestart={goHome} />
          ) : (
            <PendingResult />
          )}
        </div>
      </div>
    </main>
  );
};

export default InterviewResultPage;
