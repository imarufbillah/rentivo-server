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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

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
    // Ensure MongoDB connection is established before starting server
    await clientPromise;
    console.log('Successfully connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Rentivo server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to MongoDB connection error:', error);
    process.exit(1);
  }
};

startServer();
