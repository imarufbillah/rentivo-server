import { Request, Response } from 'express';
import * as interactionService from '../services/interaction.service';
import { createInteractionSchema, getInteractionHistorySchema, deleteInteractionSchema, propertyIdParamSchema } from '../lib/validation/interaction.schemas';
import { logValidationError, logControllerError } from '../lib/logger';

export const trackInteraction = async (req: Request, res: Response) => {
  try {
    const parsed = createInteractionSchema.safeParse(req.body);
    if (!parsed.success) {
      logValidationError(req, parsed.error, 'trackInteraction');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const interaction = await interactionService.trackInteraction(
      req.user!.id,
      parsed.data.propertyId,
      parsed.data.type
    );
    res.status(201).json({ success: true, data: { interaction } });
  } catch (error) {
    logControllerError(req, error, 'trackInteraction');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to track interaction' },
    });
  }
};

export const getInteractionHistory = async (req: Request, res: Response) => {
  try {
    const parsed = getInteractionHistorySchema.safeParse(req.query);
    if (!parsed.success) {
      logValidationError(req, parsed.error, 'getInteractionHistory');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const { type, page, limit } = parsed.data;
    const result = await interactionService.getUserInteractionsWithProperties(
      req.user!.id,
      type,
      page,
      limit
    );

    const totalPages = Math.ceil(result.total / limit);

    res.json({
      success: true,
      data: {
        interactions: result.interactions,
        pagination: { page, limit, total: result.total, totalPages },
      },
    });
  } catch (error) {
    logControllerError(req, error, 'getInteractionHistory');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch interaction history' },
    });
  }
};

export const deleteInteraction = async (req: Request, res: Response) => {
  try {
    const parsed = deleteInteractionSchema.safeParse(req.body);
    if (!parsed.success) {
      logValidationError(req, parsed.error, 'deleteInteraction');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    await interactionService.deleteInteraction(
      req.user!.id,
      parsed.data.propertyId,
      parsed.data.type
    );

    res.json({ success: true });
  } catch (error) {
    logControllerError(req, error, 'deleteInteraction');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete interaction' },
    });
  }
};

export const getUserInteractionState = async (req: Request, res: Response) => {
  try {
    const parsed = propertyIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      logValidationError(req, parsed.error, 'getUserInteractionState');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const state = await interactionService.getUserInteractionState(
      req.user!.id,
      parsed.data.propertyId
    );

    res.json({ success: true, data: state });
  } catch (error) {
    logControllerError(req, error, 'getUserInteractionState');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch interaction state' },
    });
  }
};

export const getSavedProperties = async (req: Request, res: Response) => {
  try {
    const properties = await interactionService.getUserSavedProperties(req.user!.id);
    res.json({ success: true, data: { properties } });
  } catch (error) {
    logControllerError(req, error, 'getSavedProperties');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch saved properties' },
    });
  }
};
