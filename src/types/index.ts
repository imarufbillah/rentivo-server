import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash?: string;
  role: 'renter' | 'owner';
  name?: string;
  avatar?: string;
  oauthProvider?: 'google';
  oauthId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Property {
  _id?: ObjectId;
  title: string;
  description: string;
  price: number;
  location: string;
  propertyType: 'apartment' | 'house' | 'room' | 'studio' | 'villa';
  images: string[];
  status: 'active' | 'pending' | 'archived';
  ownerId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Interaction {
  _id?: ObjectId;
  userId: ObjectId;
  propertyId: ObjectId;
  type: 'view' | 'save' | 'dismiss';
  createdAt: Date;
}

export interface Review {
  _id?: ObjectId;
  userId: ObjectId;
  propertyId: ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
