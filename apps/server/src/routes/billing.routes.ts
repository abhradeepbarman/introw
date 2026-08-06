import { Router } from 'express';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  handleWebhook,
  listPlans,
} from '../controller/billing.controller';
import auth from '../middlewares/authenticate';

const router = Router();

router.get('/plans', listPlans);
router.get('/subscription', auth, getSubscription);
router.post('/checkout', auth, createCheckoutSession);
router.post('/portal', auth, createPortalSession);
router.post('/webhook', handleWebhook);

export default router;
