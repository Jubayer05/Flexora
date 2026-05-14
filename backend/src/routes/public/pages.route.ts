import { Router } from 'express'
import { getCustomPageBySlug, getCustomPagesInfo } from '../../controllers/custom-page.controller'

const router = Router();

// ================================
// PUBLIC Custom Page Routes
// ================================

router.get('/', getCustomPagesInfo);
router.get('/:slug', getCustomPageBySlug);

export default router;