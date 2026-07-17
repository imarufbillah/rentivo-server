import { Request, Response } from 'express';
import * as interactionService from '../services/interaction.service';
import { createInteractionSchema } from '../lib/validation/interaction.schemas';

export const trackInteraction = async (req: Request, res: Response) => {
  try {
    const parsed = createInteractionSchema.safeParse(req.body);
    if (!parsed.success) {
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
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to track interaction' },
    });
  }
};

export const getSavedProperties = async (req: Request, res: Response) => {
  try {
    const properties = await interactionService.getUserSavedProperties(req.user!.id);
    res.json({ success: true, data: { properties } });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch saved properties' },
    });
  }
};
