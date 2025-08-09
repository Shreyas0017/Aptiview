import type { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';

export interface ClerkAuthRequest extends Request {
  clerkUserId?: string;
}

export function requireClerkAuth(req: ClerkAuthRequest, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized: Clerk user not authenticated' });
  }
  req.clerkUserId = auth.userId;
  next();
} 