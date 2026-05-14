import express from 'express';
import { receiveNotification } from '../controllers/notification.controller';

const router = express.Router();

// ================================
// INTERNAL ROUTES (No Auth)
// ================================
// Used by Python service, payment gateways, order system, etc.
router.post('/internal/notifications', receiveNotification);

export default router;
