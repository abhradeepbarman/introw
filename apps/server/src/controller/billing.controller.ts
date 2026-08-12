import type Stripe from 'stripe';
import envConfig from '../config/env';
import { CREDIT_MINUTES, FREE_PLAN } from '../constants';
import { prisma } from '@repo/db';
import { stripe } from '../lib/stripe';
import asyncHandler from '../utils/async-handler';
import CustomErrorHandler from '../utils/custom-error-handler';
import { logger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';

export const listPlans = asyncHandler(async (_req, res, next) => {
  if (!envConfig.STRIPE_STARTER_PRICE_ID) {
    return next(CustomErrorHandler.serverError('Billing is not configured'));
  }

  const price = await stripe.prices.retrieve(envConfig.STRIPE_STARTER_PRICE_ID, {
    expand: ['product'],
  });
  const product = price.product as Stripe.Product;

  const starter = {
    id: product.metadata.plan_id,
    name: product.name,
    price: (price.unit_amount ?? 0) / 100,
    currency: price.currency.toUpperCase(),

    credits: Number(product.metadata.credits ?? 0),
    billingInterval: price.recurring?.interval ?? null,

    resumeUpload: product.metadata.resume_upload === 'true',

    features: product.marketing_features.flatMap((f) => f.name ?? []),
  };

  return res
    .status(200)
    .send(ResponseHandler(200, 'Plans fetched successfully', { plans: [FREE_PLAN, starter] }));
});

export const getSubscription = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { plan: true, credits: true, planExpiresAt: true },
  });

  if (!user) {
    return next(CustomErrorHandler.unAuthorized());
  }

  return res.status(200).send(
    ResponseHandler(200, 'Subscription fetched successfully', {
      plan: user.plan,
      credits: user.credits,
      creditMinutes: CREDIT_MINUTES,
      renewsAt: user.planExpiresAt,
    }),
  );
});

export const createCheckoutSession = asyncHandler(async (req, res, next) => {
  if (!envConfig.STRIPE_STARTER_PRICE_ID) {
    return next(CustomErrorHandler.serverError('Billing is not configured'));
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user) {
    return next(CustomErrorHandler.unAuthorized());
  }

  if (user.plan === 'STARTER') {
    return next(CustomErrorHandler.badRequest('You are already on the Starter plan'));
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });

    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: envConfig.STRIPE_STARTER_PRICE_ID, quantity: 1 }],
    success_url: `${envConfig.APP_URL}/billing?status=success`,
    cancel_url: `${envConfig.APP_URL}/billing?status=cancelled`,
  });

  return res
    .status(200)
    .send(ResponseHandler(200, 'Checkout session created successfully', { url: session.url }));
});

export const createPortalSession = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return next(CustomErrorHandler.badRequest('No billing account found for this user'));
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${envConfig.APP_URL}/billing`,
  });

  return res
    .status(200)
    .send(ResponseHandler(200, 'Portal session created successfully', { url: session.url }));
});

const syncSubscription = async (subscription: Stripe.Subscription) => {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true, planExpiresAt: true },
  });

  if (!user) return;

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  if (!isActive) {
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: 'FREE', stripeSubscriptionId: null, planExpiresAt: null },
    });
    return;
  }

  const item = subscription.items.data[0];
  const expiresAt = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  const isNewPeriod = user.planExpiresAt?.getTime() !== expiresAt?.getTime();

  const product =
    isNewPeriod && item ? await stripe.products.retrieve(item.price.product as string) : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: 'STARTER',
      stripeSubscriptionId: subscription.id,
      planExpiresAt: expiresAt,
      ...(product && { credits: Number(product.metadata.credits ?? 0) }),
    },
  });
};

export const handleWebhook = asyncHandler(async (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return next(CustomErrorHandler.badRequest('Missing stripe signature'));
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      req.body,
      signature,
      envConfig.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    logger.error('Stripe webhook signature verification failed', error);
    return next(CustomErrorHandler.badRequest('Invalid stripe signature'));
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object);
      break;
  }

  return res.status(200).send(ResponseHandler(200, 'Webhook processed'));
});
