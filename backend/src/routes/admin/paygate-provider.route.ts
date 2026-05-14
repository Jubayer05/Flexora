import { Router } from 'express';
import {
  getPayGateProviders,
  resetPayGateProviders,
  upsertPayGateProviders
} from '../../controllers/admin/paygate-provider.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession
} from '../../middlewares/auth';

const router = Router();

router.use(adminAuthMiddleware);
router.use(requireAdminAuth);
router.use(validateAdminSession);

router.get('/', getPayGateProviders);
router.post('/', upsertPayGateProviders);
router.put('/', upsertPayGateProviders);
router.post('/reset', resetPayGateProviders);

export default router;
