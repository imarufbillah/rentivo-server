import { describe, it, expect, vi } from 'vitest';
import { AppError, errorHandler } from '../middleware/error-handler';
import { ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

const createMockReq = () => ({}) as Request;
const createMockRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response;
  return res;
};
const createMockNext = () => (() => {}) as NextFunction;

describe('AppError', () => {
  it('creates error with code, message, and statusCode', () => {
    const error = new AppError(404, 'RESOURCE_NOT_FOUND', 'Not found');

    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('RESOURCE_NOT_FOUND');
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('AppError');
  });
});

describe('errorHandler', () => {
  it('handles AppError with correct status and code', () => {
    const error = new AppError(403, 'INSUFFICIENT_ROLE', 'Owner access required');
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INSUFFICIENT_ROLE', message: 'Owner access required' }),
      })
    );
  });

  it('handles ZodError with 400 status', () => {
    const error = new ZodError([
      { code: 'custom', path: ['title'], message: 'Invalid input' },
    ]);
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'VALIDATION_FAILED', message: 'Invalid input' }),
      })
    );
  });

  it('handles unknown errors with 500 status', () => {
    const error = new Error('Something went wrong');
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }),
      })
    );
  });
});
