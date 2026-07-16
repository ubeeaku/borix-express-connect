import { useState } from "react";

interface PaystackInitParams {
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

async function callApi<T>(path: string, body: unknown): Promise<T & { success: boolean; error?: string }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-json */ }
  if (!res.ok || !data?.success) {
    const message = data?.message || data?.error || `Request failed (${res.status})`;
    return { success: false, error: message } as any;
  }
  return data;
}

export const usePaystack = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializePayment = async (params: PaystackInitParams): Promise<PaystackResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callApi<PaystackResponse>('/api/paystack/initialize', params);
      if (!data.success) throw new Error(data.error || 'Payment initialization failed');
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
      const data = await callApi<VerifyResponse>('/api/paystack/verify', { reference });
      if (!data.success) throw new Error(data.error || 'Payment verification failed');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment verification failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  return { initializePayment, verifyPayment, isLoading, error };
};
