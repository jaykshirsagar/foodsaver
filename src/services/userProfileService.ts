import { User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppRole, UserProfile } from '../types/auth';

const DEFAULT_LAT = 44.4268;
const DEFAULT_LNG = 26.1025;

function normalizeRole(role: unknown): AppRole {
  if (role === 'admin') {
    return 'admin';
  }

  if (role === 'vanzator' || role === 'donor') {
    return 'vanzator';
  }

  return 'utilizator';
}

export function observeUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
  onError: (error: unknown) => void,
): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const raw = snapshot.data() as Partial<UserProfile> & { role?: unknown };
      callback({
        uid: raw.uid ?? uid,
        email: raw.email ?? '',
        displayName: raw.displayName ?? 'Utilizator FoodSaver',
        role: normalizeRole(raw.role),
        interests: raw.interests ?? ['Bakery', 'Produce', 'Dairy'],
        lat: raw.lat ?? DEFAULT_LAT,
        lng: raw.lng ?? DEFAULT_LNG,
      });
    },
    (error) => {
      onError(error);
    },
  );
}

export async function ensureUserProfile(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const profileSnapshot = await getDoc(userRef);

  if (profileSnapshot.exists()) {
    return;
  }

  const fallbackName = user.displayName?.trim() || user.email?.split('@')[0] || 'FoodSaver User';

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email?.toLowerCase() ?? '',
    displayName: fallbackName,
    role: 'utilizator',
    interests: ['Bakery', 'Produce', 'Dairy'],
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  };

  await setDoc(userRef, profile);
}

export async function updateUserDisplayName(uid: string, displayName: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    displayName: displayName.trim(),
  });
}
