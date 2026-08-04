import { AppHeader, BackLink } from '@/components/common/app-header';
import { UserNav } from '@/components/common/user-nav';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/services/api-client';
import {
  downloadReport,
  downloadTranscript,
  getInterviewResult,
  type InterviewResult,
  type TranscriptLine,
} from '@/services/interview.service';
import {
  DIMENSION_KEYS,
  DIMENSIONS,
  type Dimension,
  type DimensionKey,
} from '@repo/common/validations';
import { ArrowRight, ChevronDown, ChevronUp, Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
      <AppHeader right={<UserNav />} />

      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-2xl flex-col px-6">
        <BackLink to="/interviews" label="Past interviews" className="pt-6" />

        <div className="flex flex-1 items-center py-8">
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
            <ScoredResult result={result} interviewId={interviewId ?? ''} onRestart={goHome} />
          ) : (
            <PendingResult />
          )}
        </div>
      </div>
    </main>
  );
};

export default InterviewResultPage;

const SCORE_HEIGHT = 'h-[clamp(2.75rem,9vw,4rem)]';
const SECTION_LABEL =
  'font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground';

const bandFor = (score: number) => {
  if (score >= 75) return 'Strong';
  if (score >= 50) return 'Promising';
  return 'Needs work';
};

function Points({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h4 className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed">
            <span aria-hidden className={`mt-2 size-1 shrink-0 rounded-full ${dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DimensionRow({ name, dimension }: { name: DimensionKey; dimension: Dimension }) {
  const { label, blurb } = DIMENSIONS[name];
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
          <Points title="Did well" items={strengths} dot="bg-brand" />
          <Points title="Work on" items={improvements} dot="bg-muted-foreground" />
        </div>
      )}
    </li>
  );
}

const SPEAKER_LABEL: Record<TranscriptLine['speaker'], string> = {
  CANDIDATE: 'You',
  INTERVIEWER: 'Interviewer',
};

const FOOTER_ACTION =
  'flex h-12 items-center justify-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5';

function ResultFooter({
  transcript,
  interviewId,
}: {
  transcript: TranscriptLine[];
  interviewId: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'report' | 'transcript' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (transcript.length === 0) return null;

  const run = async (kind: 'report' | 'transcript') => {
    setBusy(kind);
    setError(null);

    try {
      await (kind === 'report' ? downloadReport(interviewId) : downloadTranscript(interviewId));
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not download the file. Try again.',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="border-t border-border">
      <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <button
          type="button"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          aria-expanded={open}
          aria-controls="transcript-lines"
          className={FOOTER_ACTION}
        >
          {open ? <ChevronUp /> : <ChevronDown />}
          {open ? 'Hide transcript' : 'View transcript'}
        </button>

        <button
          type="button"
          onClick={() => run('report')}
          disabled={busy !== null}
          className={FOOTER_ACTION}
        >
          <Download />
          {busy === 'report' ? 'Preparing' : 'Report'}
        </button>

        <button
          type="button"
          onClick={() => run('transcript')}
          disabled={busy !== null}
          className={FOOTER_ACTION}
        >
          <Download />
          {busy === 'transcript' ? 'Preparing' : 'Transcript'}
        </button>
      </div>

      {error && (
        <p
          className="border-t border-border px-6 py-3 text-center text-xs text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {open && (
        <ul
          id="transcript-lines"
          className="max-h-96 space-y-5 overflow-y-auto border-t border-border px-6 py-5"
        >
          {transcript.map((line, index) => (
            <li key={`${line.at}-${index}`} className="space-y-1">
              <p
                className={`font-mono text-[0.625rem] uppercase tracking-[0.14em] ${
                  line.speaker === 'CANDIDATE' ? 'text-brand' : 'text-muted-foreground'
                }`}
              >
                {SPEAKER_LABEL[line.speaker]}
              </p>
              <p className="text-sm leading-relaxed">{line.message}</p>
            </li>
          ))}
        </ul>
      )}
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
          <h2 className={SECTION_LABEL}>Breakdown</h2>
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
          <h2 className={SECTION_LABEL}>Feedback</h2>
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

function ScoredResult({
  result,
  interviewId,
  onRestart,
}: {
  result: InterviewResult;
  interviewId: string;
  onRestart: () => void;
}) {
  const { score, rubric, feedback, transcript } = result;

  return (
    <ResultCard status={bandFor(score)}>
      <div className="px-6 pb-5">
        <p className={`flex items-baseline gap-1.5 ${SCORE_HEIGHT}`}>
          <span className="text-[clamp(2.75rem,9vw,4rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums">
            {score}
          </span>
          <span className="font-mono text-sm text-muted-foreground">/ 100</span>
        </p>
      </div>

      <div className="h-0.5 bg-muted" role="presentation">
        <div
          className="h-full bg-brand transition-[width] duration-700 ease-out"
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="space-y-8 px-6 py-7">
        {rubric && (
          <div className="space-y-3">
            <h2 className={SECTION_LABEL}>Breakdown</h2>
            <ul className="divide-y divide-border">
              {DIMENSION_KEYS.map((key) => (
                <DimensionRow key={key} name={key} dimension={rubric[key]} />
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <h2 className={SECTION_LABEL}>Feedback</h2>
          <p className="whitespace-pre-line leading-relaxed">{feedback}</p>
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

      <ResultFooter transcript={transcript} interviewId={interviewId} />
    </ResultCard>
  );
}
