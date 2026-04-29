import { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types/auth';
import { CreateListingPayload, Listing, UpdateListingPayload } from '../types/marketplace';

type ListingsCallback = (listings: Listing[]) => void;

type ListingsErrorCallback = (error: unknown) => void;
type PurchasedListingsCallback = (listingIds: string[]) => void;

function listingsCollection() {
  return collection(db, 'listings');
}

function userPurchasesCollection(userUid: string) {
  return collection(db, 'users', userUid, 'purchases');
}

const MAX_IMAGE_COUNT = 4;
const MAX_TOTAL_IMAGE_BYTES = 700 * 1024;

function estimateDataUriBytes(dataUri: string): number {
  const commaIdx = dataUri.indexOf(',');
  if (commaIdx < 0) {
    return 0;
  }

  const base64 = dataUri.slice(commaIdx + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function subscribeListings(
  callback: ListingsCallback,
  onError: ListingsErrorCallback,
): () => void {
  const listingsQuery = query(listingsCollection(), orderBy('createdAt', 'desc'));

  return onSnapshot(
    listingsQuery,
    (snapshot) => {
      const listings = snapshot.docs.map((item) => {
        const data = item.data() as Partial<Listing> & {
          createdAt?: { toMillis?: () => number };
        };

        return {
          id: item.id,
          ownerUid: data.ownerUid ?? '',
          owner: data.owner ?? 'Unknown',
          title: data.title ?? 'Untitled listing',
          description: data.description ?? '',
          category: data.category ?? 'Produce',
          quantity: data.quantity ?? '-',
          expiresInHours: data.expiresInHours ?? 24,
          mode: data.mode === 'Discount' ? 'Price' : (data.mode ?? 'Donate'),
          priceRon: data.priceRon ?? data.priceEur ?? 0,
          lat: data.lat ?? 44.4268,
          lng: data.lng ?? 26.1025,
          imageUrls: data.imageUrls ?? [],
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : undefined,
        };
      });

      callback(listings);
    },
    (error) => {
      onError(error);
    },
  );
}

export async function createListing(
  payload: CreateListingPayload,
  user: User,
  profile: UserProfile,
): Promise<void> {
  if (payload.imageDataUris.length > MAX_IMAGE_COUNT) {
    throw new Error('Sunt permise maximum 4 poze per anunt.');
  }

  const estimatedBytes = payload.imageDataUris.reduce((total, image) => total + estimateDataUriBytes(image), 0);
  if (estimatedBytes > MAX_TOTAL_IMAGE_BYTES) {
    throw new Error('Pozele sunt prea mari pentru Firestore. Alege imagini mai mici.');
  }

  // Keep offer mode consistent with price: 0 means donation, any positive value means sale.
  const normalizedPriceRon = Number.isFinite(payload.priceRon) ? Math.max(0, payload.priceRon) : 0;
  const normalizedMode = normalizedPriceRon <= 0 ? 'Donate' : 'Price';

  await addDoc(listingsCollection(), {
    ownerUid: user.uid,
    owner: profile.displayName,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    quantity: payload.quantity,
    expiresInHours: payload.expiresInHours,
    mode: normalizedMode,
    priceRon: normalizedPriceRon,
    lat: profile.lat,
    lng: profile.lng,
    imageUrls: payload.imageDataUris,
    createdAt: serverTimestamp(),
  });
}

export async function deleteListing(listingId: string): Promise<void> {
  await deleteDoc(doc(db, 'listings', listingId));
}

export async function updateListing(listingId: string, payload: UpdateListingPayload): Promise<void> {
  const normalizedPriceRon = Number.isFinite(payload.priceRon) ? Math.max(0, payload.priceRon) : 0;
  const normalizedMode = normalizedPriceRon <= 0 ? 'Donate' : 'Price';

  await updateDoc(doc(db, 'listings', listingId), {
    title: payload.title,
    description: payload.description,
    quantity: payload.quantity,
    expiresInHours: Math.max(1, payload.expiresInHours),
    priceRon: normalizedPriceRon,
    mode: normalizedMode,
  });
}

export function subscribePurchasedListingIds(
  userUid: string,
  callback: PurchasedListingsCallback,
  onError: ListingsErrorCallback,
): () => void {
  const purchasesQuery = query(userPurchasesCollection(userUid), orderBy('purchasedAt', 'desc'));

  return onSnapshot(
    purchasesQuery,
    (snapshot) => {
      callback(snapshot.docs.map((item) => item.id));
    },
    (error) => {
      onError(error);
    },
  );
}

export async function buyListing(userUid: string, listing: Listing): Promise<void> {
  await setDoc(doc(db, 'users', userUid, 'purchases', listing.id), {
    listingId: listing.id,
    title: listing.title,
    ownerUid: listing.ownerUid,
    owner: listing.owner,
    priceRon: listing.priceRon,
    mode: listing.mode,
    purchasedAt: serverTimestamp(),
  });
}
