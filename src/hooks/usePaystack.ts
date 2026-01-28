import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PaystackInitParams {
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

interface PaystackResponse {
  success: boolean;
  authorization_url?: string;
  reference?: string;
  access_code?: string;
  error?: string;
}

interface VerifyResponse {
  success: boolean;
  status?: 'completed' | 'failed' | 'pending';
  booking?: any;
  transaction?: any;
  error?: string;
}

export const usePaystack = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializePayment = async (params: PaystackInitParams): Promise<PaystackResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('paystack-initialize', {
        body: params,
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Payment initialization failed');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment initialization failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPayment = async (reference: string): Promise<VerifyResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('paystack-verify', {
        body: { reference },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Payment verification failed');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment verification failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    initializePayment,
    verifyPayment,
    isLoading,
    error,
  };
};
