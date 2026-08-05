import { Router } from 'express';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  handleWebhook,
  listPlans,
} from '../controller/billing.controller';
import authenticate from '../middlewares/authenticate';

const router = Router();

router.get('/plans', listPlans);
router.get('/subscription', authenticate, getSubscription);
router.post('/checkout', authenticate, createCheckoutSession);
router.post('/portal', authenticate, createPortalSession);
router.post('/webhook', handleWebhook);

export default router;
