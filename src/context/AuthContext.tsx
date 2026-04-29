import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { AuthContextValue, SignUpPayload, UserProfile } from '../types/auth';
import { observeAuthState, signInWithEmail, signOutCurrentUser, signUpWithEmail } from '../services/authService';
import { ensureUserProfile, observeUserProfile } from '../services/userProfileService';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = observeAuthState((nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);
    const unsubscribeProfile = observeUserProfile(
      user.uid,
      async (nextProfile) => {
        if (!nextProfile) {
          try {
            await ensureUserProfile(user);
          } catch (error) {
            console.warn('Profile bootstrap error', error);
            setLoading(false);
          }

          return;
        }

        setProfile(nextProfile);
        setLoading(false);
      },
      (error) => {
        console.warn('Profile listener error', error);
        setProfile(null);
        setLoading(false);
      },
    );

    return unsubscribeProfile;
  }, [user]);

  async function signIn(email: string, password: string) {
    await signInWithEmail(email, password);
  }

  async function signUp(params: SignUpPayload) {
    await signUpWithEmail(params);
  }

  async function signOutUser() {
    await signOutCurrentUser();
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOutUser,
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
