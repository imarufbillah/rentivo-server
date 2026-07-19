import { Request, Response } from 'express';
import { getCollections } from '../lib/db/collections.js';
import { ObjectId } from 'mongodb';
import { logControllerError } from '../lib/logger.js';

export const upgradeToOwner = async (req: Request, res: Response) => {
  try {
    const { users } = await getCollections();
    const userId = req.user!.id;

    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'User not found' },
      });
    }

    if (user.role === 'owner') {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_OWNER', message: 'User is already an owner' },
      });
    }

    const updated = await users.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { role: 'owner', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json({ success: true, data: { user: updated } });
  } catch (error) {
    logControllerError(req, error, 'upgradeToOwner');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to upgrade role' },
    });
  }
};
