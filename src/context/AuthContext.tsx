import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface UserOwnerStatus {
  isOwner: boolean;
  ownerConfigured: boolean;
  userId: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  ownerStatus: UserOwnerStatus | null;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null; user: User | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  clearError: () => void;
  checkOwnerStatus: () => Promise<UserOwnerStatus | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerStatus, setOwnerStatus] = useState<UserOwnerStatus | null>(null);

  const checkOwnerStatus = useCallback(async (): Promise<UserOwnerStatus | null> => {
    if (!isSupabaseConfigured || !user) {
      setOwnerStatus(null);
      return null;
    }
    try {
      // Query the server-side status RPC if it exists, or check app_owner_config
      const { data, error: rpcError } = await supabase.rpc('get_current_user_status');
      if (rpcError) {
        // Fallback: check app_owner_config directly
        const { data: ownerRows, error: ownerError } = await supabase
          .from('app_owner_config')
          .select('owner_user_id')
          .limit(1);

        if (ownerError) {
          // Table may not exist yet if migrations haven't run
          const status = { isOwner: true, ownerConfigured: false, userId: user.id };
          setOwnerStatus(status);
          return status;
        }

        const configured = ownerRows && ownerRows.length > 0;
        const isOwner = configured && ownerRows[0].owner_user_id === user.id;
        const status = { isOwner: !configured || isOwner, ownerConfigured: configured, userId: user.id };
        setOwnerStatus(status);
        return status;
      }

      if (data) {
        const status = {
          isOwner: Boolean(data.is_owner),
          ownerConfigured: Boolean(data.owner_configured),
          userId: user.id,
        };
        setOwnerStatus(status);
        return status;
      }
    } catch (err: any) {
      console.warn('Could not verify owner status:', err.message);
    }
    return null;
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Get initial persistent session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error: sessionError }) => {
      if (!isMounted) return;
      if (sessionError) {
        setError(sessionError.message);
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoading(false);
    }).catch((err: any) => {
      if (!isMounted) return;
      setError(err?.message || 'Failed to initialize session');
      setIsLoading(false);
    });

    // 2. Listen to ongoing auth state changes (sign in, sign out, token refresh, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      checkOwnerStatus();
    } else {
      setOwnerStatus(null);
    }
  }, [user, checkOwnerStatus]);

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return { error: signInError };
      }
      return { error: null };
    } catch (err: any) {
      const msg = err.message || 'Failed to sign in';
      setError(msg);
      return { error: err };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
        return { error: signUpError, user: null };
      }
      return { error: null, user: data.user };
    } catch (err: any) {
      const msg = err.message || 'Failed to sign up';
      setError(msg);
      return { error: err, user: null };
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (googleError) {
        setError(googleError.message);
        return { error: googleError };
      }
      return { error: null };
    } catch (err: any) {
      const msg = err.message || 'Failed to initiate Google sign in';
      setError(msg);
      return { error: err };
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
        return { error: signOutError };
      }
      setUser(null);
      setSession(null);
      setOwnerStatus(null);
      return { error: null };
    } catch (err: any) {
      const msg = err.message || 'Failed to sign out';
      setError(msg);
      return { error: err };
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        error,
        ownerStatus,
        isConfigured: isSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        clearError,
        checkOwnerStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
