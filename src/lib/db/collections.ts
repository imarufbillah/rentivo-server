import clientPromise from './mongodb';
import { Db, Collection } from 'mongodb';
import { User, Property, Interaction, Review } from '../../types/index';

let cachedDb: Db | null = null;

export const getDatabase = async (): Promise<Db> => {
  if (cachedDb) {
    return cachedDb;
  }

  const client = await clientPromise;
  const db = client.db('rentivo');
  cachedDb = db;
  return db;
};

export interface Collections {
  users: Collection<User>;
  properties: Collection<Property>;
  interactions: Collection<Interaction>;
  reviews: Collection<Review>;
}

// Type-safe collection accessors
export const getCollections = async (): Promise<Collections> => {
  const db = await getDatabase();
  
  return {
    users: db.collection<User>('user'),
    properties: db.collection<Property>('properties'),
    interactions: db.collection<Interaction>('interactions'),
    reviews: db.collection<Review>('reviews'),
  };
};
