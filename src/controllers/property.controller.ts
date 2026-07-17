import { Request, Response } from 'express';
import * as propertyService from '../services/property.service';
import { createPropertySchema, updatePropertySchema, propertyFilterSchema } from '../lib/validation/property.schemas';

export const createProperty = async (req: Request, res: Response) => {
  try {
    const parsed = createPropertySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const property = await propertyService.createProperty(parsed.data, req.user!.id);
    res.status(201).json({ success: true, data: { property } });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create property' },
    });
  }
};

export const getProperties = async (req: Request, res: Response) => {
  try {
    const parsed = propertyFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const { page, limit, ...filters } = parsed.data;
    const result = await propertyService.searchProperties(filters, { page, limit });
    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to search properties' },
    });
  }
};

export const getPropertyById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const property = await propertyService.getPropertyById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Property not found' },
      });
    }

    res.json({ success: true, data: { property } });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch property' },
    });
  }
};

export const updateProperty = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updatePropertySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const property = await propertyService.updateProperty(id, parsed.data, req.user!.id);
    res.json({ success: true, data: { property } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update property';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 404 ? 'RESOURCE_NOT_FOUND' : 'INTERNAL_ERROR', message },
    });
  }
};

export const deleteProperty = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await propertyService.deleteProperty(id, req.user!.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete property';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 404 ? 'RESOURCE_NOT_FOUND' : 'INTERNAL_ERROR', message },
    });
  }
};

export const getMyProperties = async (req: Request, res: Response) => {
  try {
    const properties = await propertyService.getPropertiesByOwner(req.user!.id);
    res.json({ success: true, data: { properties } });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch properties' },
    });
  }
};
