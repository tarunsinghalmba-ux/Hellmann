import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  userActive: boolean | null;
  isSuperUser: boolean;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateUserRole: (userId: string, role: string, active: boolean) => Promise<{ error: any }>;
  getAllUsers: () => Promise<{ data: any[], error: any }>;
  deleteUser: (userId: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userActive, setUserActive] = useState<boolean | null>(null);
  const [isSuperUser, setIsSuperUser] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, active')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        // If table doesn't exist or other error, default to Regular User
        if (error.code === 'PGRST116' || error.message.includes('Could not find the table')) {
          console.log('User roles table not found, defaulting to Regular User');
          setUserRole('Regular User');
          setUserActive(false);
        } else {
          console.error('Error fetching user role:', error);
          setUserRole('Regular User');
          setUserActive(false);
        }
      } else {
        setUserRole(data?.role || 'Regular');
        setUserActive(data?.active || false);
        setIsSuperUser(data?.role === 'Super Admin' && data?.active === true);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('Regular');
      setUserActive(false);
      setIsSuperUser(false);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
          setUserActive(null);
          setIsSuperUser(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase client not initialized' } };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase client not initialized' } };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    setUserRole(null);
    setUserActive(null);
    setIsSuperUser(false);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Sign out warning:', error.message);
      }
      // Redirect to home page after sign out
      window.location.href = '/';
    } catch (error) {
      console.warn('Sign out failed, but clearing local state:', error);
      // Still redirect to home page even if sign out failed
      window.location.href = '/';
    }
  };

  const updateUserRole = async (userId: string, role: string, active: boolean) => {
    if (!supabase || !isSuperUser) {
      return { error: { message: 'Unauthorized: Only SuperUsers can update roles' } };
    }

    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role,
        active,
        updated_at: new Date().toISOString()
      });

    return { error };
  };

  const getAllUsers = async () => {
    if (!supabase || !isSuperUser) {
      return { data: [], error: { message: 'Unauthorized: Only SuperUsers can view all users' } };
    }

    const { data, error } = await supabase
      .from('user_management')
      .select('*')
      .order('user_created_at', { ascending: false });

    return { data: data || [], error };
  };

  const deleteUser = async (userId: string) => {
    if (!supabase || !isSuperUser) {
      return { error: { message: 'Unauthorized: Only SuperUsers can deactivate users' } };
    }

    // Deactivate user by setting active to false
    const { error } = await supabase
      .from('user_roles')
      .update({ 
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    return { error };
  };

  const value = {
    user,
    session,
    userRole,
    userActive,
    isSuperUser,
    loading,
    signUp,
    signIn,
    signOut,
    updateUserRole,
    getAllUsers,
    deleteUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}