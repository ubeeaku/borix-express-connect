import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface WalletPaymentParams {
  email: string;
  amount: number;
  name: string;
  phone: string;
  routeId: string;
  date: string;
  time: string;
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
  const navigate = useNavigate();

  const payWithWallet = async (params: WalletPaymentParams): Promise<WalletPaymentResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-pay', {
        body: params,
      });

      if (error) {
        console.error('Wallet payment error:', error);
        return { success: false, error: error.message || 'Payment failed' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Payment failed' };
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
