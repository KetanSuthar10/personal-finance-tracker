import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type OwnerStatusState = 'loading' | 'unconfigured' | 'authorized' | 'denied' | 'error';

export interface UserOwnerStatus {
  isOwner: boolean;
  ownerConfigured: boolean;
  userId: string | null;
  statusState: OwnerStatusState;
  errorMessage?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  ownerStatus: UserOwnerStatus | null;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null; user: User | null }>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  bootstrapOwner: () => Promise<{ error: Error | null; success: boolean }>;
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const checkOwnerStatus = useCallback(async (): Promise<UserOwnerStatus | null> => {
    if (!isSupabaseConfigured || !user) {
      setOwnerStatus(null);
      return null;
    }

    try {
      // Query the server-side status RPC
      const { data, error: rpcError } = await supabase.rpc('get_current_user_status');
      
      if (rpcError) {
        console.error('Owner status verification failed (RPC error):', rpcError.message);
        // Under strict fail-closed security rules: an RPC error must NEVER grant owner access
        const status: UserOwnerStatus = {
          isOwner: false,
          ownerConfigured: false,
          userId: user.id,
          statusState: 'error',
          errorMessage: rpcError.message,
        };
        setOwnerStatus(status);
        return status;
      }

      if (data) {
        const configured = Boolean(data.owner_configured);
        const isOwner = Boolean(data.is_owner);

        let statusState: OwnerStatusState = 'denied';
        if (!configured) {
          statusState = 'unconfigured';
        } else if (isOwner) {
          statusState = 'authorized';
        }

        const status: UserOwnerStatus = {
          isOwner,
          ownerConfigured: configured,
          userId: user.id,
          statusState,
        };
        setOwnerStatus(status);
        return status;
      }
    } catch (err: any) {
      console.error('Exception during owner verification:', err?.message);
      const status: UserOwnerStatus = {
        isOwner: false,
        ownerConfigured: false,
        userId: user.id,
        statusState: 'error',
        errorMessage: err?.message || 'Verification exception',
      };
      setOwnerStatus(status);
      return status;
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

    // 2. Listen to ongoing auth state changes (sign in, sign out, token refresh, OAuth callback, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
        setOwnerStatus(null);
      }

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

  const sendPasswordResetEmail = async (email: string) => {
    setError(null);
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (resetError) {
        setError(resetError.message);
        return { error: resetError };
      }
      return { error: null };
    } catch (err: any) {
      const msg = err.message || 'Failed to send password reset email';
      setError(msg);
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setError(updateError.message);
        return { error: updateError };
      }
      setIsPasswordRecovery(false);
      return { error: null };
    } catch (err: any) {
      const msg = err.message || 'Failed to update password';
      setError(msg);
      return { error: err };
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
        let message = googleError.message;
        if (message.includes('provider is not enabled') || message.includes('Unsupported provider')) {
          message = 'Google login is not yet enabled in your Supabase dashboard. Please go to Supabase -> Authentication -> Providers -> Google, toggle "Enable Google Provider" to ON, and save. In the meantime, you can create an account or sign in with Email below.';
        }
        setError(message);
        return { error: { ...googleError, message } };
      }
      return { error: null };
    } catch (err: any) {
      let msg = err.message || 'Failed to initiate Google sign in';
      if (msg.includes('provider is not enabled') || msg.includes('Unsupported provider')) {
        msg = 'Google login is not yet enabled in your Supabase dashboard. Please go to Supabase -> Authentication -> Providers -> Google, toggle "Enable Google Provider" to ON, and save. In the meantime, you can create an account or sign in with Email below.';
      }
      setError(msg);
      return { error: err };
    }
  };

  const bootstrapOwner = async (): Promise<{ error: Error | null; success: boolean }> => {
    if (!user) return { error: new Error('User not authenticated'), success: false };
    try {
      const { data, error: rpcError } = await supabase.rpc('bootstrap_app_owner');
      if (rpcError) {
        return { error: new Error(rpcError.message), success: false };
      }
      if (data && data.success) {
        await checkOwnerStatus();
        return { error: null, success: true };
      }
      return { error: new Error('Bootstrap did not return success'), success: false };
    } catch (err: any) {
      return { error: err, success: false };
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
      setIsPasswordRecovery(false);
      return { error: null };
    } catch (err: any) {
      const msg = err.message || 'Failed to sign out';
      setError(msg);
      return { error: err };
    }
  };

  const clearError = () => setError(null);
  const clearPasswordRecovery = () => setIsPasswordRecovery(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        error,
        ownerStatus,
        isConfigured: isSupabaseConfigured,
        isPasswordRecovery,
        clearPasswordRecovery,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordResetEmail,
        updatePassword,
        signInWithGoogle,
        signOut,
        bootstrapOwner,
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

