import Stripe from 'stripe';
import { Request, Response } from 'express';
import * as rentalService from '../services/rental.service.js';
import { stripe } from '../lib/stripe.js';
import { logControllerError } from '../lib/logger.js';

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
    logControllerError(req, error, 'createCheckout');
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
  } catch (error) {
    logControllerError(req, error, 'cancelPending');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel rental' },
    });
  }
};

export const confirm = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'sessionId is required' },
      });
    }

    const result = await rentalService.confirmRental(sessionId);
    res.json({ success: true, data: result });
  } catch (error) {
    logControllerError(req, error, 'confirmRental');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm rental' },
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

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    logControllerError(req, error, 'webhook - signature validation');
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'Invalid webhook signature' },
    });
  }

  try {
    const result = await rentalService.handleWebhook(event);
    res.json({ received: true, processed: result.processed });
  } catch (error) {
    logControllerError(req, error, 'webhook - event handling');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to process webhook' },
    });
  }
};

export const getMyRentals = async (req: Request, res: Response) => {
  try {
    const rentals = await rentalService.getUserRentals(req.user!.id);
    res.json({ success: true, data: { rentals } });
  } catch (error) {
    logControllerError(req, error, 'getMyRentals');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch rentals' },
    });
  }
};

export const getPropertyRentalStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const status = await rentalService.getPropertyRentalStatus(id);
    res.json({ success: true, data: status });
  } catch (error) {
    logControllerError(req, error, 'getPropertyRentalStatus');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to check rental status' },
    });
  }
};
