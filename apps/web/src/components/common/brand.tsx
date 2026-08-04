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
      <svg viewBox="0 0 24 24" fill="none" className="size-[1.15rem]">
        <path
          d="M4.2 1.5H10.8A2.4 2.4 0 0 1 13.2 3.9V7.1A2.4 2.4 0 0 1 10.8 9.5H7.8L4.6 12.6V9.5H4.2A2.4 2.4 0 0 1 1.8 7.1V3.9A2.4 2.4 0 0 1 4.2 1.5Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M14 12.4H19.8A2.4 2.4 0 0 1 22.2 14.8V17.6A2.4 2.4 0 0 1 19.8 20L19.8 23.1L16.6 20H14A2.4 2.4 0 0 1 11.6 17.6V14.8A2.4 2.4 0 0 1 14 12.4Z"
          fill="currentColor"
          strokeLinejoin="round"
        />
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
