import { AppHeader, BackLink } from '@/components/common/app-header';
import type { ReactNode } from 'react';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ eyebrow, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="min-h-dvh">
      <AppHeader eyebrow={eyebrow} />

      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col px-6">
        <BackLink to="/" label="Home" className="pt-6" />

        <div className="flex flex-1 items-center py-8">
          <section className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[0_28px_70px_-45px_hsl(196_44%_8%/0.4)]">
            <div className="space-y-2.5 px-7 pt-8">
              <h1 className="font-display text-3xl font-bold leading-tight tracking-[-0.03em]">
                {title}
              </h1>
              <p className="leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>

            <div className="px-7 py-7">{children}</div>

            {footer ? (
              <div className="border-t border-border px-7 py-4 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
