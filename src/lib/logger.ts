import { Request } from 'express';
import { ZodError } from 'zod';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logValidationError = (req: Request, error: ZodError, context: string) => {
  if (!isDevelopment) return;
  
  console.error(`\n❌ Validation error (${context}):`);
  console.error('User:', req.user?.email || 'unauthenticated');
  console.error('Route:', req.method, req.originalUrl);
  console.error('Issues:', JSON.stringify(error.issues, null, 2));
  console.error('---\n');
};

export const logControllerError = (req: Request, error: unknown, context: string) => {
  if (!isDevelopment) return;
  
  console.error(`\n❌ Error in ${context}:`);
  console.error('User:', req.user?.email || 'unauthenticated');
  console.error('Route:', req.method, req.originalUrl);
  console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
  if (error instanceof Error && error.stack) {
    console.error('Stack:', error.stack);
  }
  console.error('---\n');
};
