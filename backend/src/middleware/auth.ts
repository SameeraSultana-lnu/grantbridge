import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

type TokenPayload = {
  userId: number;
  email: string;
};

export function signAuthToken(payload: TokenPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }

  const token = header.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
    req.auth = {
      userId: decoded.userId,
      email: decoded.email,
    };
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}
