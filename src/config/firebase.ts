import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

function readEnv(name: string): string {
  return process.env[name] ?? '';
}

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

const storageBucket = readEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
const storageBucketCandidates = buildStorageBucketCandidates(storageBucket);

const firebaseConfig = {
  apiKey: readEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: readEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket,
  messagingSenderId: readEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  measurementId: readEnv('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID'),
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
