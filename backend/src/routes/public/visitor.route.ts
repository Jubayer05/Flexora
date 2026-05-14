import { Router } from 'express';
import * as visitorController from '../../controllers/visitor.controller';

const router = Router();

// Public endpoint - track visitor
router.post('/track', visitorController.trackVisitor);

// Public endpoint - get visitor stats
router.get('/stats', visitorController.getVisitorStats);

// Public endpoint - get total visitors
router.get('/total', visitorController.getTotalVisitors);

export default router;
