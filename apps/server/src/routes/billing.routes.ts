import { Router } from 'express';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  handleWebhook,
} from '../controller';
import { auth } from '../middlewares';

const router = Router();

router.get('/subscription', auth, getSubscription);
router.post('/checkout', auth, createCheckoutSession);
router.post('/portal', auth, createPortalSession);
router.post('/webhook', handleWebhook);

export default router;
