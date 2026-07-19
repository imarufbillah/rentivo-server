import { Request, Response } from 'express';
import * as rentalService from '../services/rental.service';
import { stripe } from '../lib/stripe';

export const createCheckout = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'propertyId is required' },
      });
    }

    const result = await rentalService.createCheckoutSession(propertyId, req.user!.id);
    res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    const status = message.includes('not found')
      ? 404
      : message.includes('Cannot rent your own property')
        ? 403
        : message.includes('not available') || message.includes('already rented')
          ? 409
          : 500;
    res.status(status).json({
      success: false,
      error: {
        code: status === 404 ? 'RESOURCE_NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        message,
      },
    });
  }
};

export const cancelPending = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'propertyId is required' },
      });
    }

    const result = await rentalService.cancelPendingRental(propertyId, req.user!.id);
    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel rental' },
    });
  }
};

export const webhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Stripe webhook secret not configured' },
    });
  }

  let event: import('stripe').Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'Invalid webhook signature' },
    });
  }

  const result = await rentalService.handleWebhook(event);
  res.json({ received: true, processed: result.processed });
};

export const getMyRentals = async (req: Request, res: Response) => {
  try {
    const rentals = await rentalService.getUserRentals(req.user!.id);
    res.json({ success: true, data: { rentals } });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch rentals' },
    });
  }
};

export const getPropertyRentalStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = await rentalService.getPropertyRentalStatus(id);
    res.json({ success: true, data: status });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to check rental status' },
    });
  }
};
