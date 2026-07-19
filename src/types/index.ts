import { ObjectId } from 'mongodb';

export type PropertyType = 'apartment' | 'house' | 'room' | 'studio' | 'villa';
export type PropertyStatus = 'active' | 'pending' | 'archived';
export type InteractionType = 'view' | 'save' | 'dismiss';
export type UserRole = 'renter' | 'owner';
export type SortField = 'price' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash?: string;
  role: UserRole;
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
  propertyType: PropertyType;
  images: string[];
  status: PropertyStatus;
  ownerId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Interaction {
  _id?: ObjectId;
  userId: ObjectId;
  propertyId: ObjectId;
  type: InteractionType;
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

export interface CreatePropertyDTO {
  title: string;
  description: string;
  price: number;
  location: string;
  propertyType: PropertyType;
  images: string[];
  status?: PropertyStatus;
}

export type UpdatePropertyDTO = Partial<CreatePropertyDTO>;

export interface PropertyFilters {
  search?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: PropertyType;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export interface Pagination {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RecommendationFilters {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: PropertyType;
}

export interface RecommendedProperty {
  property: Property;
  explanation: string;
  score?: number;
}

export interface PropertyWithStats extends Property {
  viewCount: number;
  saveCount: number;
  dismissCount: number;
  averageRating: number | null;
  totalReviews: number;
}
