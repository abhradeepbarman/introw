import { AppHeader, BackLink } from '@/components/app-header';
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
          <section className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="space-y-2 px-6 pt-7">
              <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>

            <div className="px-6 py-7">{children}</div>

            {footer ? (
              <div className="border-t border-border px-6 py-4 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
