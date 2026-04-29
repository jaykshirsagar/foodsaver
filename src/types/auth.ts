import { User } from 'firebase/auth';

export type AppRole = 'vanzator' | 'utilizator' | 'admin';
export type SignUpRole = Exclude<AppRole, 'admin'>;

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: AppRole;
  interests: ListingInterest[];
  lat: number;
  lng: number;
};

export type ListingInterest = 'Bakery' | 'Produce' | 'Dairy' | 'Prepared';

export type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: SignUpPayload) => Promise<void>;
  signOutUser: () => Promise<void>;
};

export type SignUpPayload = {
  email: string;
  password: string;
  displayName: string;
  role: SignUpRole;
};
