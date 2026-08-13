import 'express';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        email: string;
      };
    }
  }
}

export {};
