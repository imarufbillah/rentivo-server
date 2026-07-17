import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import clientPromise from './lib/db/mongodb';
import propertyRoutes from './routes/property.routes';

dotenv.config();

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
