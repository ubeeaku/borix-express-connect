import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { apiUrl } from "@/lib/apiBase";

interface WalletPaymentParams {
  email: string;
  amount: number;
  name: string;
  phone: string;
  departureId: string;
  passengers: string;
  seats: number[];
  nextOfKinName: string;
  nextOfKinPhone: string;
}

interface WalletPaymentResult {
  success: boolean;
  reference?: string;
  newBalance?: number;
  error?: string;
}

export const useWalletPayment = () => {
  const [isLoading, setIsLoading] = useState(false);

  const payWithWallet = async (params: WalletPaymentParams): Promise<WalletPaymentResult> => {
    setIsLoading(true);
    try {
      // Supabase is used only for the auth session token; the payment itself
      // runs on the Vercel serverless function.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'Please sign in to pay with your wallet' };
      }

      const res = await fetch(apiUrl('/api/wallet/pay'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(params),
      });

      let data: any = null;
      try { data = await res.json(); } catch { /* non-JSON */ }

      if (!res.ok || !data?.success) {
        return { success: false, error: data?.error || `Payment failed (${res.status})` };
      }

      return {
        success: true,
        reference: data.reference,
        newBalance: data.newBalance,
      };
    } catch (err) {
      console.error('Wallet payment exception:', err);
      return { success: false, error: 'Unable to process payment' };
    } finally {
      setIsLoading(false);
    }
  };

  return { payWithWallet, isLoading };
};
