import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      issues: error.flatten(),
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  // Log full error server-side but never expose stack traces or internal messages to clients
  console.error('Unhandled error', error instanceof Error ? error.stack : error);
  return res.status(500).json({ message: 'Internal server error' });
}
