declare global {
  namespace Express {
    interface Request {
      clerkUserId?: string;
    }
  }
} 