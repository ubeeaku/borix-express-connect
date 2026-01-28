import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface AdminAuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
}

// Helper function to check admin role using server-side RPC only
const checkIsAdmin = async (userId: string): Promise<boolean> => {
  try {
    // Use RPC call for server-side validation - fail closed if unavailable
    const { data, error } = await supabase.rpc('is_admin', { _user_id: userId });
    
    if (error) {
      console.error('Admin check failed:', error.message);
      return false; // Fail closed - deny access if check fails
    }
    
    return data === true;
  } catch {
    return false; // Fail closed on any error
  }
};

export const useAdminAuth = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AdminAuthState>({
    user: null,
    session: null,
    isAdmin: false,
    isLoading: true,
  });

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Defer admin check with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setAuthState(prev => ({
            ...prev,
            isAdmin: false,
            isLoading: false,
          }));
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const isAdmin = await checkIsAdmin(userId);
    
    setAuthState(prev => ({
      ...prev,
      isAdmin,
      isLoading: false,
    }));

    if (!isAdmin) {
      navigate('/admin/login');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  return {
    ...authState,
    signOut,
  };
};
