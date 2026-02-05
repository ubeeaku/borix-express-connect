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
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: params,
      });

      if (error) {
        console.error('Refund error:', error);
        return { success: false, error: error.message || 'Refund failed' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Refund failed' };
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
