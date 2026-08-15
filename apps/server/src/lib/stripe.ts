import Stripe from 'stripe';
import { envConfig } from '../config';

export const stripe = new Stripe(envConfig.STRIPE_SECRET_KEY);
