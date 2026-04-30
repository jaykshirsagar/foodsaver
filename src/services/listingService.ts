import { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types/auth';
import { CreateListingPayload, Listing, UpdateListingPayload } from '../types/marketplace';

type ListingsCallback = (listings: Listing[]) => void;

type ListingsErrorCallback = (error: unknown) => void;
type PurchasedListingsCallback = (listingIds: string[]) => void;

export function formatListingError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (normalized.includes('permission-denied') || normalized.includes('insufficient permissions')) {
    return 'Nu am putut finaliza comanda din cauza permisiunilor Firestore. Publica noile reguli Firestore si incearca din nou.';
  }

  if (normalized.includes('not-found') || normalized.includes('nu mai este disponibil')) {
    return 'Produsul nu mai este disponibil.';
  }

  if (normalized.includes('a expirat')) {
    return 'Produsul a expirat si nu mai poate fi cumparat.';
  }

  if (normalized.includes('nu poti cumpara propriul anunt')) {
    return 'Nu poti cumpara propriul anunt.';
  }

  return message || 'Nu am putut finaliza comanda.';
}

function listingsCollection() {
  return collection(db, 'listings');
}

export async function syncOwnerNameInListings(ownerUid: string, displayName: string): Promise<void> {
  const listingsQuery = query(listingsCollection(), where('ownerUid', '==', ownerUid));
  const snapshot = await getDocs(listingsQuery);

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(db);
  snapshot.docs.forEach((item) => {
    batch.update(item.ref, { owner: displayName.trim() });
  });

  await batch.commit();
}

function userPurchasesCollection(userUid: string) {
  return collection(db, 'users', userUid, 'purchases');
}

const MAX_IMAGE_COUNT = 4;
const MAX_TOTAL_IMAGE_BYTES = 700 * 1024;
const HOUR_MS = 60 * 60 * 1000;

function normalizeExpiresAtMs(expiresAtMs: number): number {
  const minimum = Date.now() + HOUR_MS;
  if (!Number.isFinite(expiresAtMs)) {
    return minimum;
  }

  return Math.max(minimum, expiresAtMs);
}

function deriveExpiresInHours(expiresAtMs: number): number {
  return Math.max(1, Math.ceil((expiresAtMs - Date.now()) / HOUR_MS));
}

function computeEffectiveExpiresAtMs(listing: Listing): number | null {
  if (typeof listing.expiresAt === 'number') {
    return listing.expiresAt;
  }

  if (typeof listing.createdAt === 'number') {
    return listing.createdAt + listing.expiresInHours * HOUR_MS;
  }

  return null;
}

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
        const data = item.data() as Omit<Partial<Listing>, 'mode'> & {
          mode?: Listing['mode'] | 'Discount';
          priceEur?: number;
          createdAt?: { toMillis?: () => number };
          expiresAt?: { toMillis?: () => number };
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
          expiresAt: data.expiresAt?.toMillis ? data.expiresAt.toMillis() : undefined,
        };
      });

      const now = Date.now();
      callback(listings.filter((item) => {
        const expiresAtMs = computeEffectiveExpiresAtMs(item);
        return expiresAtMs === null || expiresAtMs > now;
      }));
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
  const normalizedExpiresAtMs = normalizeExpiresAtMs(payload.expiresAtMs);
  const normalizedExpiresInHours = deriveExpiresInHours(normalizedExpiresAtMs);

  await addDoc(listingsCollection(), {
    ownerUid: user.uid,
    owner: profile.displayName,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    quantity: payload.quantity,
    expiresInHours: normalizedExpiresInHours,
    expiresAt: Timestamp.fromMillis(normalizedExpiresAtMs),
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
  const normalizedExpiresAtMs = normalizeExpiresAtMs(payload.expiresAtMs);
  const normalizedExpiresInHours = deriveExpiresInHours(normalizedExpiresAtMs);

  await updateDoc(doc(db, 'listings', listingId), {
    title: payload.title,
    description: payload.description,
    quantity: payload.quantity,
    expiresInHours: normalizedExpiresInHours,
    expiresAt: Timestamp.fromMillis(normalizedExpiresAtMs),
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
  if (listing.ownerUid === userUid) {
    throw new Error('Nu poti cumpara propriul anunt.');
  }

  const expiresAtMs = computeEffectiveExpiresAtMs(listing);
  if (expiresAtMs !== null && expiresAtMs <= Date.now()) {
    throw new Error('Produsul a expirat si nu mai poate fi cumparat.');
  }

  await runTransaction(db, async (transaction) => {
    const listingRef = doc(db, 'listings', listing.id);
    const purchaseRef = doc(db, 'users', userUid, 'purchases', listing.id);
    const listingSnapshot = await transaction.get(listingRef);

    if (!listingSnapshot.exists()) {
      throw new Error('Produsul nu mai este disponibil.');
    }

    const listingData = listingSnapshot.data() as {
      expiresAt?: { toMillis?: () => number };
      createdAt?: { toMillis?: () => number };
      expiresInHours?: number;
    };

    const serverExpiresAtMs = listingData.expiresAt?.toMillis
      ? listingData.expiresAt.toMillis()
      : listingData.createdAt?.toMillis && Number.isFinite(listingData.expiresInHours)
        ? listingData.createdAt.toMillis() + (listingData.expiresInHours as number) * HOUR_MS
        : null;

    if (serverExpiresAtMs !== null && serverExpiresAtMs <= Date.now()) {
      throw new Error('Produsul a expirat si nu mai poate fi cumparat.');
    }

    transaction.set(purchaseRef, {
      listingId: listing.id,
      title: listing.title,
      ownerUid: listing.ownerUid,
      owner: listing.owner,
      priceRon: listing.priceRon,
      mode: listing.mode,
      buyerUid: userUid,
      purchasedAt: serverTimestamp(),
    });

    transaction.delete(listingRef);
  });
}
