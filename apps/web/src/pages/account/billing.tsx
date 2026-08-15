import { AppHeader, BackLink } from '@/components/common/app-header';
import { UserNav } from '@/components/common/user-nav';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  type Subscription,
} from '@/services/billing.service';
import { ArrowRight, Check, CreditCard, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const STARTER_PRICE = '₹1,000';
const STARTER_SESSIONS = 5;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const sessionWord = (count: number) => (count === 1 ? 'session' : 'sessions');

function Banner({ tone, children }: { tone: 'brand' | 'muted'; children: ReactNode }) {
  return (
    <p
      role="status"
      className={cn(
        'mt-6 rounded-xl border px-5 py-4 text-sm',
        tone === 'brand'
          ? 'border-brand/30 bg-brand-wash text-foreground'
          : 'border-border bg-secondary/50 text-muted-foreground',
      )}
    >
      {children}
    </p>
  );
}

function BalanceCard({ subscription }: { subscription: Subscription }) {
  const { plan, credits, sessionMinutes, renewsAt } = subscription;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-40px_hsl(196_44%_8%/0.4)]">
      <div className="flex items-start justify-between gap-4 px-6 py-6">
        <div>
          <p className="label-mono text-muted-foreground">Sessions left</p>
          <p className="mt-2 font-display text-5xl font-bold tabular-nums leading-none tracking-[-0.03em]">
            {credits}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {sessionMinutes} minutes each, scored report included.
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="label-mono text-brand">{plan === 'STARTER' ? 'Starter' : 'Free'}</p>
          {renewsAt && (
            <p className="mt-2 text-sm text-muted-foreground">Renews {formatDate(renewsAt)}</p>
          )}
        </div>
      </div>

      {credits === 0 && (
        <p className="border-t border-border px-6 py-4 text-sm text-muted-foreground">
          You have no sessions left. Subscribe below to get {STARTER_SESSIONS} more each month.
        </p>
      )}
    </section>
  );
}

function PlanCard({
  name,
  price,
  cadence,
  features,
  current,
  action,
}: {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  current: boolean;
  action?: ReactNode;
}) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-2xl border bg-card px-6 py-7',
        current ? 'border-brand/40 shadow-[0_20px_50px_-40px_hsl(196_44%_8%/0.4)]' : 'border-border',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-[-0.015em]">{name}</h2>
        {current && <span className="label-mono text-brand">Current</span>}
      </div>

      <p className="mt-4 font-display text-3xl font-bold tracking-[-0.03em]">
        {price}
        <span className="ml-1.5 font-mono text-sm font-normal text-muted-foreground">
          {cadence}
        </span>
      </p>

      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-brand" />
            {feature}
          </li>
        ))}
      </ul>

      {action && <div className="mt-7">{action}</div>}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card [animation-delay:150ms]" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card [animation-delay:300ms]" />
      </div>
    </div>
  );
}

const BillingPage = () => {
  const [searchParams] = useSearchParams();
  const checkoutStatus = searchParams.get('status');
  const justPaid = checkoutStatus === 'success';

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState<'checkout' | 'portal' | null>(null);
  const [awaitingWebhook, setAwaitingWebhook] = useState(justPaid);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;

    const load = () => {
      getSubscription()
        .then((data) => {
          if (!active) return;

          setSubscription(data);
          setError(null);

          // Stripe redirects back before its webhook has necessarily reached us
          if (justPaid && data.plan === 'FREE' && attempts < 5) {
            attempts += 1;
            timer = setTimeout(load, 2000);
            return;
          }

          setAwaitingWebhook(false);
        })
        .catch((cause: unknown) => {
          if (!active) return;
          console.error('Failed to load subscription:', cause);
          setError(
            cause instanceof ApiError
              ? cause.message
              : 'Could not load your subscription. Check your connection and try again.',
          );
          setAwaitingWebhook(false);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    load();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [justPaid]);

  const goToStripe = async (kind: 'checkout' | 'portal') => {
    setRedirecting(kind);
    setError(null);

    try {
      const { url } =
        kind === 'checkout' ? await createCheckoutSession() : await createPortalSession();

      if (!url) {
        setError('Stripe did not return a link. Try again in a moment.');
        return;
      }

      window.location.href = url;
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not reach Stripe. Try again.');
    } finally {
      setRedirecting(null);
    }
  };

  const subscribed = subscription?.plan === 'STARTER';

  return (
    <main className="min-h-dvh">
      <AppHeader right={<UserNav />} />

      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col px-6">
        <BackLink to="/" label="Home" className="pt-6" />

        <div className="flex-1 pb-16 pt-6">
          <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-bold tracking-[-0.03em]">
            Plan and sessions
          </h1>
          <p className="mt-3 max-w-lg text-muted-foreground">
            Every interview costs one session. Your first one is on us.
          </p>

          {awaitingWebhook && (
            <Banner tone="brand">
              <Loader2 className="mr-2 inline size-4 animate-spin align-[-0.2em]" />
              Payment received. Confirming with Stripe — your sessions will appear here in a few
              seconds.
            </Banner>
          )}

          {checkoutStatus === 'cancelled' && (
            <Banner tone="muted">Checkout cancelled. You have not been charged.</Banner>
          )}

          {error && (
            <p className="mt-6 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="mt-8">
            {loading ? (
              <LoadingState />
            ) : subscription ? (
              <div className="space-y-4">
                <BalanceCard subscription={subscription} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <PlanCard
                    name="Free"
                    price="₹0"
                    cadence="once"
                    current={!subscribed}
                    features={[
                      '1 interview session, one time',
                      `${subscription.sessionMinutes} minutes of live interview`,
                      'Scored report and transcript',
                    ]}
                  />

                  <PlanCard
                    name="Starter"
                    price={STARTER_PRICE}
                    cadence="/ month"
                    current={subscribed}
                    features={[
                      `${STARTER_SESSIONS} interview ${sessionWord(STARTER_SESSIONS)} every month`,
                      `${subscription.sessionMinutes} minutes of live interview`,
                      'Scored report and transcript',
                      'Cancel any time',
                    ]}
                    action={
                      subscribed ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={redirecting !== null}
                          onClick={() => void goToStripe('portal')}
                          className="h-11 w-full rounded-lg"
                        >
                          <CreditCard className="size-4" />
                          {redirecting === 'portal' ? 'Opening' : 'Manage billing'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={redirecting !== null}
                          onClick={() => void goToStripe('checkout')}
                          className="h-11 w-full rounded-lg bg-brand text-[0.9375rem] font-semibold text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
                        >
                          {redirecting === 'checkout' ? 'Opening' : 'Subscribe'}
                          <ArrowRight className="size-4" />
                        </Button>
                      )
                    }
                  />
                </div>

                {subscription.credits > 0 && (
                  <p className="pt-2 text-center text-sm text-muted-foreground">
                    You have {subscription.credits} {sessionWord(subscription.credits)} ready.{' '}
                    <Link
                      to="/"
                      className="font-medium text-brand underline-offset-4 hover:underline"
                    >
                      Start an interview
                    </Link>
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
};

export default BillingPage;
