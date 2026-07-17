import { MongoClient, MongoClientOptions } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rentivo';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

// MongoDB connection pool configuration for production workloads
const options: MongoClientOptions = {
  // Connection pool settings
  maxPoolSize: 50,              // Maximum connections in pool
  minPoolSize: 5,               // Minimum connections to maintain
  maxIdleTimeMS: 60000,         // Close idle connections after 60 seconds
  
  // Timeout settings
  serverSelectionTimeoutMS: 5000,  // Fail fast if server unavailable
  socketTimeoutMS: 45000,          // Socket timeout for operations
  connectTimeoutMS: 10000,         // Initial connection timeout
  
  // Retry configuration
  retryWrites: true,            // Retry failed write operations
  retryReads: true,             // Retry failed read operations
  
  // Monitoring and health checks
  heartbeatFrequencyMS: 10000,  // Check server health every 10 seconds
  
  // TLS/SSL configuration (enable for production, especially MongoDB Atlas)
  tls: process.env.NODE_ENV === 'production',
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
};

// Singleton pattern: reuse connection across application lifecycle
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development, use global variable to preserve connection across hot reloads
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, create new client instance
  client = new MongoClient(MONGODB_URI, options);
  clientPromise = client.connect();
}

// Export promise to ensure connection is established before use
export default clientPromise;

// Graceful shutdown handler
process.on('SIGINT', async () => {
  try {
    await client?.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});
