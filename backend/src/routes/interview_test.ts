import { Router, Response } from 'express';
import { requireClerkAuth, ClerkAuthRequest } from '../middleware/requireClerkAuth';
import { prisma } from '../db';

const router = Router();

// Test route
router.get('/test', (req: ClerkAuthRequest, res: Response) => {
  res.json({ message: 'Interview routes working' });
});

export default router;
