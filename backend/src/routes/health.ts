import { Router, Request, Response } from 'express';

const router = Router();

// Base health endpoint (supports all methods to avoid 405 from some monitors)
router.all('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'healthy' });
});

// Health check ping endpoint (supports all methods)
router.all('/ping', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'pong' });
});

export default router;
