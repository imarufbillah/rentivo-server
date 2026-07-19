import { ObjectId } from 'mongodb';

export type PropertyType = 'apartment' | 'house' | 'room' | 'studio' | 'villa';
export type PropertyStatus = 'active' | 'pending' | 'archived' | 'rented';
export type InteractionType = 'view' | 'save';
export type UserRole = 'renter' | 'owner';
export type SortField = 'price' | 'createdAt' | 'bedrooms';
export type SortOrder = 'asc' | 'desc';
export type FurnishingStatus = 'furnished' | 'semi-furnished' | 'unfurnished';
export type PropertyCondition = 'new' | 'excellent' | 'good' | 'fair';
export type ParkingStatus = 'included' | 'available' | 'none';
export type PetPolicy = 'allowed' | 'not-allowed' | 'case-by-case';
export type SmokingPolicy = 'allowed' | 'not-allowed';
export type RentFrequency = 'monthly' | 'weekly' | 'daily';

export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash?: string;
  role: UserRole;
  name?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  isVerified?: boolean;
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
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  size?: number;
  balconies?: number;
  floor?: number;
  totalFloors?: number;
  furnishing?: FurnishingStatus;
  condition?: PropertyCondition;
  utilities?: string[];
  parking?: ParkingStatus;
  internet?: boolean;
  securityDeposit?: number;
  advancePayment?: number;
  leaseDuration?: number;
  minStay?: number;
  rentFrequency?: RentFrequency;
  petPolicy?: PetPolicy;
  smokingPolicy?: SmokingPolicy;
  houseRules?: string;
  rentalTerms?: string;
  fullAddress?: string;
  lat?: number;
  lng?: number;
  availableFrom?: Date;
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
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  size?: number;
  balconies?: number;
  floor?: number;
  totalFloors?: number;
  furnishing?: FurnishingStatus;
  condition?: PropertyCondition;
  utilities?: string[];
  parking?: ParkingStatus;
  internet?: boolean;
  securityDeposit?: number;
  advancePayment?: number;
  leaseDuration?: number;
  minStay?: number;
  rentFrequency?: RentFrequency;
  petPolicy?: PetPolicy;
  smokingPolicy?: SmokingPolicy;
  houseRules?: string;
  rentalTerms?: string;
  fullAddress?: string;
  lat?: number;
  lng?: number;
  availableFrom?: Date;
}

export type UpdatePropertyDTO = Partial<CreatePropertyDTO>;

export interface PropertyFilters {
  search?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: PropertyType;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  amenities?: string[];
  minRating?: number;
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
  averageRating: number | null;
  totalReviews: number;
}

export type RentalStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface Rental {
  _id?: ObjectId;
  propertyId: ObjectId;
  renterId: ObjectId;
  ownerId: ObjectId;
  status: RentalStatus;
  monthlyRent: number;
  securityDeposit: number;
  advancePayment: number;
  totalPaid: number;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  leaseDuration: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RentalWithProperty extends Rental {
  property: {
    _id: ObjectId;
    title: string;
    images: string[];
    location: string;
    price: number;
  } | null;
}
