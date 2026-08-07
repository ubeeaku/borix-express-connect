import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface Wallet {
  id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  booking_reference: string | null;
  created_at: string;
}

interface UseWalletReturn {
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  isLoading: boolean;
  error: string | null;
  user: User | null;
  refetch: () => Promise<void>;
}

export const useWallet = (): UseWalletReturn => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const fetchWalletData = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch wallet
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletError) {
        throw new Error(walletError.message);
      }

      setWallet(walletData);

      // Fetch transactions if wallet exists
      if (walletData) {
        const { data: transactionsData, error: transactionsError } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", walletData.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (transactionsError) {
          throw new Error(transactionsError.message);
        }

        setTransactions(transactionsData || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    if (user?.id) {
      await fetchWalletData(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchWalletData(session.user.id);
        } else {
          setWallet(null);
          setTransactions([]);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchWalletData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    wallet,
    transactions,
    isLoading,
    error,
    user,
    refetch,
  };
};
