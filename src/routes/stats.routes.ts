import { Router, Request, Response } from 'express';
import { getDatabase } from '../lib/db/collections.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();

    const [propertyCount, userCount, reviewAgg] = await Promise.all([
      db.collection('property').countDocuments({ status: 'active' }),
      db.collection('user').countDocuments({ role: 'renter' }),
      db.collection('review').aggregate([
        { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]).toArray(),
    ]);

    const stats = reviewAgg[0] || { avgRating: 0, count: 0 };

    res.json({
      success: true,
      data: {
        properties: propertyCount,
        renters: userCount,
        averageRating: stats.avgRating ? Math.round(stats.avgRating * 10) / 10 : 0,
        reviews: stats.count,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'STATS_ERROR', message: 'Failed to fetch stats' },
    });
  }
});

export default router;
