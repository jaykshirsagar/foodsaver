import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

function buildStorageBucketCandidates(rawBucket: string): string[] {
  const candidates: string[] = [];

  if (!rawBucket) {
    return candidates;
  }

  candidates.push(rawBucket);

  if (rawBucket.endsWith('.firebasestorage.app')) {
    candidates.push(rawBucket.replace('.firebasestorage.app', '.appspot.com'));
  }

  if (rawBucket.endsWith('.appspot.com')) {
    candidates.push(rawBucket.replace('.appspot.com', '.firebasestorage.app'));
  }

  return Array.from(new Set(candidates));
}

const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '';
const storageBucketCandidates = buildStorageBucketCandidates(storageBucket);

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const primaryBucket = storageBucketCandidates[0];
const storage = primaryBucket ? getStorage(app, `gs://${primaryBucket}`) : getStorage(app);

const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
})();

export { app, auth, db, storage, storageBucketCandidates };
