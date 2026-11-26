import { Router } from 'express';

const router = Router();

/**
 * GET /health
 * Basic health check endpoint.
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
