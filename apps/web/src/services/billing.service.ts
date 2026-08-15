import type { ApiResponse } from '@/lib/api-error';
import axiosInstance from '@/lib/axios';

export type Plan = 'FREE' | 'STARTER';

export type Subscription = {
  plan: Plan;
  credits: number;
  sessionMinutes: number;
  renewsAt: string | null;
};

export type StripeRedirect = {
  url: string | null;
};

export const getSubscription = () =>
  axiosInstance
    .get<ApiResponse<Subscription>>('/billing/subscription')
    .then((res) => res.data.data);

export const createCheckoutSession = () =>
  axiosInstance.post<ApiResponse<StripeRedirect>>('/billing/checkout').then((res) => res.data.data);

export const createPortalSession = () =>
  axiosInstance.post<ApiResponse<StripeRedirect>>('/billing/portal').then((res) => res.data.data);
