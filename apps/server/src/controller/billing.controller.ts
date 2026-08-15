import type Stripe from 'stripe';
import { Plan, prisma } from '@repo/db';
import { envConfig } from '../config';
import { MAX_INTERVIEW_MINUTES, SUBSCRIPTION_CREDITS } from '../constants';
import { stripe } from '../lib';
import { asyncHandler, CustomErrorHandler, logger, ResponseHandler } from '../utils';

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
      sessionMinutes: MAX_INTERVIEW_MINUTES,
      renewsAt: user.planExpiresAt,
    }),
  );
});

export const createCheckoutSession = asyncHandler(async (req, res, next) => {
  if (!envConfig.STRIPE_PRICE_ID) {
    return next(CustomErrorHandler.serverError('Billing is not configured'));
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user) {
    return next(CustomErrorHandler.unAuthorized());
  }

  if (user.plan === Plan.STARTER) {
    return next(CustomErrorHandler.badRequest('You are already subscribed'));
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
    line_items: [{ price: envConfig.STRIPE_PRICE_ID, quantity: 1 }],
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

  // Credits already paid for stay usable after the plan lapses
  if (!isActive) {
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: Plan.FREE, stripeSubscriptionId: null, planExpiresAt: null },
    });
    return;
  }

  const periodEnd = subscription.items.data[0]?.current_period_end;
  const expiresAt = periodEnd ? new Date(periodEnd * 1000) : null;
  const isNewPeriod = user.planExpiresAt?.getTime() !== expiresAt?.getTime();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: Plan.STARTER,
      stripeSubscriptionId: subscription.id,
      planExpiresAt: expiresAt,
      ...(isNewPeriod && { credits: SUBSCRIPTION_CREDITS }),
    },
  });
};

export const handleWebhook = asyncHandler(async (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  if (typeof signature !== 'string') {
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
