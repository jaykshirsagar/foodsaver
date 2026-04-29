import {
  EmailAuthProvider,
  AuthError,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { SignUpPayload, UserProfile } from '../types/auth';

const DEFAULT_LAT = 44.4268;
const DEFAULT_LNG = 26.1025;

export function formatAuthError(error: unknown): string {
  const authError = error as Partial<AuthError> | undefined;
  const code = authError?.code ?? '';
  const message = authError?.message ?? '';
  const composite = `${code} ${message}`.toLowerCase();

  if (composite.includes('configuration_not_found') || composite.includes('configuration-not-found')) {
    return 'Firebase Auth nu este configurat complet. In Firebase Console, intra la Authentication, apasa Get started, activeaza Email/Password, apoi reporneste Expo cu: npx expo start -c';
  }

  if (composite.includes('invalid-api-key')) {
    return 'Cheie API Firebase invalida. Verifica EXPO_PUBLIC_FIREBASE_API_KEY in .env';
  }

  if (composite.includes('operation-not-allowed')) {
    return 'Autentificarea Email/Password este dezactivata. Activeaz-o in Firebase Console > Authentication > Sign-in method.';
  }

  if (composite.includes('email-already-in-use')) {
    return 'Acest email este deja inregistrat. Incearca autentificarea.';
  }

  if (composite.includes('invalid-credential') || composite.includes('wrong-password')) {
    return 'Email-ul sau parola sunt incorecte.';
  }

  if (composite.includes('user-not-found')) {
    return 'Nu exista cont pentru acest email. Fa mai intai inregistrarea.';
  }

  if (composite.includes('weak-password')) {
    return 'Parola este prea slaba. Foloseste minimum 6 caractere.';
  }

  return authError?.message ?? 'Autentificarea a esuat. Verifica setarile Firebase si credentialele.';
}

export function observeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmail(payload: SignUpPayload): Promise<void> {
  const response = await createUserWithEmailAndPassword(auth, payload.email.trim(), payload.password);

  const profile: UserProfile = {
    uid: response.user.uid,
    email: payload.email.trim().toLowerCase(),
    displayName: payload.displayName.trim(),
    role: payload.role,
    interests: ['Bakery', 'Produce', 'Dairy'],
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  };

  await setDoc(doc(db, 'users', response.user.uid), profile);
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(auth);
}

export async function updateCurrentUserDisplayName(displayName: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Nu exista utilizator autentificat.');
  }

  await updateProfile(currentUser, { displayName: displayName.trim() });
}

export async function updateCurrentUserPassword(newPassword: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Nu exista utilizator autentificat.');
  }

  await updatePassword(currentUser, newPassword);
}

export async function updateCurrentUserPasswordWithCurrent(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('Nu exista utilizator autentificat.');
  }

  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, newPassword);
}
