import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const ERROR_CODES = {
  UNAUTHORIZED: 401,
  SESSION_EXPIRED: 401,
  VALIDATION_FAILED: 400,
  RESOURCE_NOT_FOUND: 404,
  INSUFFICIENT_ROLE: 403,
  ALREADY_OWNER: 409,
  DUPLICATE_REVIEW: 409,
  REVIEW_NOT_ALLOWED: 403,
  INTERNAL_ERROR: 500,
  LLM_SERVICE_UNAVAILABLE: 503,
} as const;

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: err.issues[0].message },
    });
  }

  if (err.name === 'MongoServerError') {
    return res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Database operation failed' },
    });
  }

  if (err.name === 'MongoNetworkError') {
    return res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database connection failed' },
    });
  }

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
};
