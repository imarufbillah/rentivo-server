import './config';
import express from 'express';
import cors from 'cors';
import clientPromise from './lib/db/mongodb';
import { errorHandler } from './middleware/error-handler';
import propertyRoutes from './routes/property.routes';
import interactionRoutes from './routes/interaction.routes';
import reviewRoutes from './routes/review.routes';
import recommendationRoutes from './routes/recommendation.routes';
import chatRoutes from './routes/chat.routes';
import userRoutes from './routes/user.routes';
import { ensureIndexes as ensurePropertyIndexes } from './services/property.service';
import { ensureIndexes as ensureInteractionIndexes } from './services/interaction.service';
import { ensureIndexes as ensureReviewIndexes } from './services/review.service';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

const isDevelopment = process.env.NODE_ENV !== 'production';

app.use((req, res, next) => {
  const start = Date.now();
  
  // Log request details in development
  if (isDevelopment) {
    console.log(`\n→ ${req.method} ${req.originalUrl}`);
    if (Object.keys(req.query).length > 0) {
      console.log('  Query:', req.query);
    }
    if (req.headers.authorization) {
      console.log('  Auth:', req.headers.authorization.substring(0, 20) + '...');
    }
  }
  
  res.on('finish', () => {
    const ms = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : '✅';
    
    if (isDevelopment) {
      console.log(`${statusColor} ${req.method} ${req.originalUrl} ${res.statusCode} in ${ms}ms`);
    } else {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} in ${ms}ms`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/properties', propertyRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await clientPromise;
    console.log('Successfully connected to MongoDB');

    await Promise.all([
      ensurePropertyIndexes(),
      ensureInteractionIndexes(),
      ensureReviewIndexes(),
    ]);
    console.log('Database indexes ensured');

    app.listen(PORT, () => {
      console.log(`Rentivo server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to MongoDB connection error:', error);
    process.exit(1);
  }
};

startServer();
