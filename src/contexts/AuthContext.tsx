import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authReady: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; data?: any }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const initialResolved = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        // Only set loading=false from listener after initial getSession resolved
        if (initialResolved.current) {
          setLoading(false);
        }
      }
    );

    // Check for existing session with error handling + timeout
    const timeout = setTimeout(() => {
      // Safety net: if getSession hangs for 8s, force resolve
      if (!initialResolved.current) {
        console.warn('[AuthProvider] getSession timed out, clearing session');
        initialResolved.current = true;
        setSession(null);
        setUser(null);
        setLoading(false);
        setAuthReady(true);
      }
    }, 8000);

    supabase.auth.getSession()
      .then(({ data: { session: existingSession }, error }) => {
        clearTimeout(timeout);
        if (error) {
          console.error('[AuthProvider] getSession error:', error.message);
          // Clear corrupted session locally
          supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          setSession(null);
          setUser(null);
        } else {
          setSession(existingSession);
          setUser(existingSession?.user ?? null);
        }
        initialResolved.current = true;
        setLoading(false);
        setAuthReady(true);
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error('[AuthProvider] getSession unexpected error:', err);
        // Clear corrupted session locally
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null);
        setUser(null);
        initialResolved.current = true;
        setLoading(false);
        setAuthReady(true);
      });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error, data };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    // Use local scope to handle corrupted sessions gracefully
    try {
      await supabase.auth.signOut();
    } catch {
      // If remote signOut fails, force local cleanup
      await supabase.auth.signOut({ scope: 'local' });
    }
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, authReady, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
