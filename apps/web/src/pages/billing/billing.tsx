import { AppHeader, BackLink } from '@/components/common/app-header';
import { UserNav } from '@/components/common/user-nav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  listPlans,
  type Plan,
  type Subscription,
} from '@/services/billing.service';
import { ArrowRight, Check, Clock, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const formatPrice = (plan: Plan) =>
  plan.price === 0
    ? 'Free'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: plan.currency,
        maximumFractionDigits: 0,
      }).format(plan.price);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

function CurrentPlan({
  subscription,
  onManage,
  busy,
}: {
  subscription: Subscription;
  onManage: () => void;
  busy: boolean;
}) {
  const { plan, credits, renewsAt } = subscription;

  return (
    <section className="overflow-hidden rounded-2xl bg-ink text-ink-foreground shadow-[0_30px_80px_-40px_hsl(196_44%_8%/0.55)]">
      <div className="flex items-center justify-between gap-4 border-b border-ink-border px-5 py-3.5 sm:px-7">
        <p className="label-mono text-ink-muted">Current plan</p>
        <p className="font-mono text-xs text-ink-muted">
          {renewsAt ? `Renews ${formatDate(renewsAt)}` : 'No renewal scheduled'}
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-6 px-5 py-7 sm:px-7">
        <div>
          <p className="font-display text-3xl font-bold tracking-[-0.03em]">{plan.name}</p>
          <p className="mt-2 text-ink-muted">
            Interviews run up to {plan.maxInterviewMinutes} minutes.
          </p>
        </div>

        <div className="text-right">
          <p className="font-display text-4xl font-bold tabular-nums leading-none tracking-[-0.03em]">
            {credits}
          </p>
          <p className="mt-2 label-mono text-ink-muted">
            {credits === 1 ? 'credit left' : 'credits left'}
          </p>
        </div>
      </div>

      {plan.id === 'STARTER' && (
        <div className="border-t border-ink-border px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={onManage}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md label-mono text-ink-muted outline-none transition-colors hover:text-ink-foreground focus-visible:ring-2 focus-visible:ring-brand-light/60 disabled:opacity-50"
          >
            <CreditCard className="size-4" />
            {busy ? 'Opening' : 'Manage billing'}
          </button>
        </div>
      )}
    </section>
  );
}

function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
  busy,
}: {
  plan: Plan;
  isCurrent: boolean;
  onUpgrade: () => void;
  busy: boolean;
}) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-2xl border bg-card p-6 shadow-[0_20px_50px_-40px_hsl(196_44%_8%/0.4)]',
        isCurrent ? 'border-brand/40 ring-1 ring-brand/20' : 'border-border',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-[-0.015em]">{plan.name}</h2>
        {isCurrent && <span className="label-mono text-brand">Current</span>}
      </div>

      <p className="mt-4 font-display text-3xl font-bold tracking-[-0.03em]">
        {formatPrice(plan)}
        {plan.price > 0 && (
          <span className="font-sans text-sm font-normal text-muted-foreground"> / month</span>
        )}
      </p>

      <ul className="mt-6 flex-1 space-y-3 border-t border-border pt-6">
        {plan.features.map((feature) => {
          const soon = feature.toLowerCase().includes('soon');
          const Icon = soon ? Clock : Check;

          return (
            <li key={feature} className="flex items-start gap-2.5 text-sm">
              <Icon
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  soon ? 'text-muted-foreground/60' : 'text-brand',
                )}
              />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-7">
        {isCurrent ? (
          <p className="grid h-11 place-items-center rounded-lg border border-dashed border-border label-mono text-muted-foreground">
            You are here
          </p>
        ) : plan.id === 'STARTER' ? (
          <Button
            type="button"
            onClick={onUpgrade}
            disabled={busy}
            className="h-11 w-full rounded-lg bg-brand text-[0.9375rem] font-semibold text-brand-foreground transition-transform hover:bg-brand-hover focus-visible:ring-brand/40 active:scale-[0.99]"
          >
            {busy ? 'Opening checkout' : 'Upgrade to Starter'}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <p className="grid h-11 place-items-center rounded-lg border border-dashed border-border label-mono text-muted-foreground">
            Downgrade at period end
          </p>
        )}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-8" aria-hidden>
      <div className="h-44 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl bg-muted [animation-delay:120ms]" />
        <div className="h-72 animate-pulse rounded-2xl bg-muted [animation-delay:240ms]" />
      </div>
    </div>
  );
}

const BillingPage = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([listPlans(), getSubscription()])
      .then(([planList, current]) => {
        if (!active) return;
        setPlans(planList.plans);
        setSubscription(current);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        console.error('Failed to load billing:', cause);
        setError(
          cause instanceof ApiError
            ? cause.message
            : 'Could not load your billing details. Check your connection and try again.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const redirectToStripe = async (kind: 'checkout' | 'portal') => {
    setBusy(kind);
    setActionError(null);

    try {
      const { url } = await (kind === 'checkout' ? createCheckoutSession() : createPortalSession());
      window.location.href = url;
    } catch (cause) {
      setActionError(
        cause instanceof ApiError ? cause.message : 'Could not reach Stripe. Try again.',
      );
      setBusy(null);
    }
  };

  return (
    <main className="min-h-dvh">
      <AppHeader right={<UserNav />} />

      <div className="mx-auto w-full max-w-4xl px-6">
        <BackLink to="/" label="Home" className="pt-6" />

        <div className="pb-16 pt-6">
          <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-bold tracking-[-0.03em]">
            Billing
          </h1>
          <p className="mt-3 max-w-lg text-muted-foreground">
            One credit is one interview. Credits refresh each billing period on Starter.
          </p>

          {status === 'success' && (
            <p
              className="mt-8 rounded-xl border border-brand/30 bg-brand-wash px-4 py-3 text-sm text-brand"
              role="status"
            >
              Payment received. Your plan updates here within a few moments — refresh if it still
              says Free.
            </p>
          )}

          {status === 'cancelled' && (
            <p
              className="mt-8 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground"
              role="status"
            >
              Checkout cancelled. You have not been charged.
            </p>
          )}

          <div className="mt-8">
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : loading || !subscription ? (
              <LoadingState />
            ) : (
              <div className="space-y-8">
                <CurrentPlan
                  subscription={subscription}
                  onManage={() => void redirectToStripe('portal')}
                  busy={busy === 'portal'}
                />

                <div className="grid gap-6 sm:grid-cols-2">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isCurrent={plan.id === subscription.plan.id}
                      onUpgrade={() => void redirectToStripe('checkout')}
                      busy={busy === 'checkout'}
                    />
                  ))}
                </div>

                {actionError && (
                  <p className="text-center text-sm text-destructive" role="alert">
                    {actionError}
                  </p>
                )}

                <p className="text-center text-sm text-muted-foreground">
                  Payments are handled by Stripe. Cancel any time from the billing portal.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default BillingPage;
