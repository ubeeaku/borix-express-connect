import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'lovable.app',
  'lovable.dev',
  'lovableproject.com',
  'vercel.app',
  'borixexpress.com',
];

export function applyCors(req: VercelRequest, res: VercelResponse) {
  const origin = String(req.headers.origin || '');
  let allowed = 'https://borixexpress.com';
  try {
    if (origin) {
      const url = new URL(origin);
      if (ALLOWED_ORIGINS.some(d => url.hostname === d || url.hostname.endsWith(`.${d}`))) {
        allowed = origin;
      }
    }
  } catch { /* default */ }
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
}

export function safeCallbackOrigin(req: VercelRequest): string {
  const origin = String(req.headers.origin || '');
  try {
    if (origin) {
      const url = new URL(origin);
      if (ALLOWED_ORIGINS.some(d => url.hostname === d || url.hostname.endsWith(`.${d}`))) {
        return origin;
      }
    }
  } catch { /* fall through */ }
  return 'https://borixexpress.com';
}

export function getServiceClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase server config missing');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export function getAuthClient(authHeader: string): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';
  if (!url || !anonKey) throw new Error('Supabase auth config missing');
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
}

export function jsonError(res: VercelResponse, status: number, message: string, details?: unknown) {
  return res.status(status).json({ success: false, message, details: details ?? null });
}

export function generateReference(): string {
  const rand =
    typeof (globalThis as any).crypto?.randomUUID === 'function'
      ? (globalThis as any).crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).replace(/\./g, '') + Date.now().toString(36);
  return `BRX-${rand.substring(0, 12).toUpperCase()}`;
}

export const PAYSTACK_BASE = 'https://api.paystack.co';
