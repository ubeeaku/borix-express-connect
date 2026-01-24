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

// Helper function to check admin role
const checkIsAdmin = async (userId: string): Promise<boolean> => {
  try {
    // Try RPC call first (will work after migration is applied)
    const { data, error } = await (supabase.rpc as any)('is_admin', { _user_id: userId });
    
    if (!error && data === true) {
      return true;
    }
    
    // Fallback: try direct table query
    const { data: roleData, error: roleError } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();
    
    if (!roleError && roleData?.role === 'admin') {
      return true;
    }
    
    return false;
  } catch {
    return false;
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
