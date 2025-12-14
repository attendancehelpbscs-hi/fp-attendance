import { Router } from 'express';
import { getHealthStatus, getCorruptionStats } from '../controllers/health.controller';

const router = Router();

/**
 * @route GET /api/health
 * @desc Get overall system health status including fingerprint integrity
 * @access Public (for monitoring systems)
 */
router.get('/', getHealthStatus);

/**
 * @route GET /api/health/corruption-stats
 * @desc Get detailed corruption statistics for fingerprints
 * @access Private (admin only)
 */
router.get('/corruption-stats', getCorruptionStats);

export default router;
