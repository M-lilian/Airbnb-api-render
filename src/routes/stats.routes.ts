import { Router } from 'express';

import { getUserStats } from '../controllers/stats.controller';
import { getListingStats } from '../controllers/listings.controller';

const router = Router();

/**
 * @swagger
 * /users/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Statistics on users and roles
 */
router.get('/users/stats', getUserStats);

/**
 * @swagger
 * /listings/stats:
 *   get:
 *     summary: Get listing statistics
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Statistics on listings grouped by location and type
 */
router.get('/listings/stats', getListingStats);

export default router;