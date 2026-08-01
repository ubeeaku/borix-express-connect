import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RefundParams {
  bookingId: string;
  passengerEmail: string;
  refundAmount: number;
  reason?: string;
}

interface RefundResult {
  success: boolean;
  message?: string;
  refundAmount?: number;
  bookingReference?: string;
  newWalletBalance?: number;
  error?: string;
}

export const useRefund = () => {
  const [isLoading, setIsLoading] = useState(false);

  const processRefund = async (params: RefundParams): Promise<RefundResult> => {
    setIsLoading(true);
    try {
      // Supabase is used only for the auth session token; the refund itself
      // runs on the Vercel serverless function.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' };
      }

      const res = await fetch('/api/paystack/refund', {
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
        return { success: false, error: data?.error || `Refund failed (${res.status})` };
      }

      return {
        success: true,
        message: data.message,
        refundAmount: data.refundAmount,
        bookingReference: data.bookingReference,
        newWalletBalance: data.newWalletBalance,
      };
    } catch (err) {
      console.error('Refund exception:', err);
      return { success: false, error: 'Unable to process refund' };
    } finally {
      setIsLoading(false);
    }
  };

  return { processRefund, isLoading };
};
