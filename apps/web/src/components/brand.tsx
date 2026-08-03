import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-[0.55rem] bg-brand text-brand-foreground shadow-sm',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[1.05rem]">
        <path
          d="M7 8.25 10.75 12 7 15.75"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M13.75 15.75H17.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('text-[0.9375rem] font-semibold tracking-[-0.025em]', className)}>
      intervue
      <span className="text-brand">.</span>
    </span>
  );
}

export function Brand({ className, to = '/' }: { className?: string; to?: string | null }) {
  if (to === null) {
    return (
      <span className={cn('flex items-center gap-2.5', className)}>
        <BrandMark />
        <Wordmark />
      </span>
    );
  }

  return (
    <Link
      to={to}
      aria-label="intervue home"
      className={cn(
        'flex items-center gap-2.5 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand/40',
        className,
      )}
    >
      <BrandMark />
      <Wordmark />
    </Link>
  );
}
