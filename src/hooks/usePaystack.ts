import { useState } from "react";
import { apiUrl } from "@/lib/apiBase";

const API_BASE = "/api/paystack";

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

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const usePaystack = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializePayment = async (params: PaystackInitParams): Promise<PaystackResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      return await postJson<PaystackResponse>(`${API_BASE}/initialize`, params);
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
      return await postJson<VerifyResponse>(`${API_BASE}/verify`, { reference });
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
