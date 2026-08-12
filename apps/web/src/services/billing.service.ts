import { apiGet, apiPost } from './api-client';

export type PlanId = 'FREE' | 'STARTER';

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  credits: number;
  billingInterval: string | null;
  resumeUpload: boolean;
  features: string[];
};

export type Subscription = {
  plan: PlanId;
  credits: number;
  creditMinutes: number;
  renewsAt: string | null;
};

export const listPlans = () => apiGet<{ plans: Plan[] }>('/billing/plans');

export const getSubscription = () => apiGet<Subscription>('/billing/subscription');

export const createCheckoutSession = () => apiPost<{ url: string }>('/billing/checkout', {});

export const createPortalSession = () => apiPost<{ url: string }>('/billing/portal', {});
