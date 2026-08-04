import { Brand } from '@/components/common/brand';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AppHeader({
  right,
  eyebrow,
  brandTo,
}: {
  right?: ReactNode;
  eyebrow?: string;
  brandTo?: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Brand to={brandTo} />
        {right ??
          (eyebrow ? <span className="label-mono text-muted-foreground">{eyebrow}</span> : null)}
      </div>
    </header>
  );
}

export function BackLink({
  to,
  label,
  className,
}: {
  to: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40',
        className,
      )}
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  );
}
