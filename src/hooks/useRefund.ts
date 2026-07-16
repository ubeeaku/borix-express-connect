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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return { success: false, error: 'You must be signed in as an admin' };

      const res = await fetch('/api/paystack/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      let data: any = null;
      try { data = await res.json(); } catch { /* ignore */ }

      if (!res.ok || !data?.success) {
        return { success: false, error: data?.message || data?.error || 'Refund failed' };
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
