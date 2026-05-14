import { Router } from 'express'
import {
    getSubscriptionPackageById,
    getSubscriptionPackages,
} from '../../controllers/subscription-package.controller'

const router = Router();

// ================================
// PUBLIC SUBSCRIPTION PACKAGE ROUTES
// ================================

/**
 * @route   GET /subscription-packages
 * @desc    Get all active subscription packages
 * @access  Public
 */
router.get('/', getSubscriptionPackages);

/**
 * @route   GET /subscription-packages/:id
 * @desc    Get subscription package by ID
 * @access  Public
 */
router.get('/:id', getSubscriptionPackageById);

export default router;
