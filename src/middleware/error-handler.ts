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

const isDevelopment = process.env.NODE_ENV !== 'production';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Log detailed error in development
  if (isDevelopment) {
    console.error('\n❌ Error occurred:');
    console.error('Route:', req.method, req.originalUrl);
    console.error('Type:', err.name);
    console.error('Message:', err.message);
    if (err.stack) {
      console.error('Stack:', err.stack);
    }
    if (err instanceof ZodError) {
      console.error('Validation Issues:', JSON.stringify(err.issues, null, 2));
    }
    console.error('---\n');
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { 
        code: err.code, 
        message: err.message,
        ...(isDevelopment && { stack: err.stack })
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'VALIDATION_FAILED', 
        message: err.issues[0].message,
        ...(isDevelopment && { issues: err.issues })
      },
    });
  }

  if (err.name === 'MongoServerError') {
    return res.status(500).json({
      success: false,
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Database operation failed',
        ...(isDevelopment && { details: err.message })
      },
    });
  }

  if (err.name === 'MongoNetworkError') {
    return res.status(503).json({
      success: false,
      error: { 
        code: 'SERVICE_UNAVAILABLE', 
        message: 'Database connection failed',
        ...(isDevelopment && { details: err.message })
      },
    });
  }

  // Log unexpected errors even in production
  console.error('Unexpected error:', err);

  return res.status(500).json({
    success: false,
    error: { 
      code: 'INTERNAL_ERROR', 
      message: 'An unexpected error occurred',
      ...(isDevelopment && { details: err.message, stack: err.stack })
    },
  });
};
