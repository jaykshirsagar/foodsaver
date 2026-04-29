import { ListingInterest } from './auth';

export type ListingMode = 'Donate' | 'Price';

export type Listing = {
  id: string;
  ownerUid: string;
  owner: string;
  title: string;
  description: string;
  category: ListingInterest;
  quantity: string;
  expiresInHours: number;
  mode: ListingMode;
  priceRon: number;
  lat: number;
  lng: number;
  imageUrls: string[];
  createdAt?: number;
};

export type CreateListingPayload = {
  title: string;
  description: string;
  category: ListingInterest;
  quantity: string;
  expiresInHours: number;
  mode: ListingMode;
  priceRon: number;
  imageDataUris: string[];
};

export type UpdateListingPayload = {
  title: string;
  description: string;
  quantity: string;
  expiresInHours: number;
  priceRon: number;
};

export type RankedListing = Listing & {
  distance: number;
  score: number;
  shouldNotify: boolean;
};
