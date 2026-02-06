import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'lovable.app',
  'lovable.dev',
  'lovableproject.com',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  let allowedOrigin = 'https://lovable.app';
  
  try {
    if (origin) {
      const url = new URL(origin);
      const isAllowed = ALLOWED_ORIGINS.some(domain => 
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );
      if (isAllowed) {
        allowedOrigin = origin;
      }
    }
  } catch {
    // Invalid origin URL, use default
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Input validation schema
const RefundSchema = z.object({
  bookingId: z.string().uuid(),
  passengerEmail: z.string().email(),
  refundAmount: z.number().positive(),
  reason: z.string().min(1).max(500).optional(),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin status
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for admin check and database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', { _user_id: user.id });
    
    if (adminError || !isAdmin) {
      console.error('Admin check failed:', adminError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing refund by admin:', user.id);

    // Parse and validate input
    let validatedInput;
    try {
      const rawInput = await req.json();
      validatedInput = RefundSchema.parse(rawInput);
    } catch (validationError) {
      console.error('Input validation failed:', validationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid input data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { bookingId, passengerEmail, refundAmount, reason } = validatedInput;

    // Verify booking exists and matches email
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_reference, passenger_email, total_amount, payment_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (booking.passenger_email.toLowerCase() !== passengerEmail.toLowerCase()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email does not match booking' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by email
    const { data: authUser, error: userError } = await supabase.auth.admin.listUsers();
    
    let targetUserId: string | null = null;
    if (!userError && authUser?.users) {
      const foundUser = authUser.users.find(u => u.email?.toLowerCase() === passengerEmail.toLowerCase());
      if (foundUser) {
        targetUserId = foundUser.id;
      }
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found. The passenger must have an account to receive wallet refunds.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create wallet for user
    let wallet;
    const { data: existingWallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', targetUserId)
      .single();

    if (walletError || !existingWallet) {
      // Create wallet for user
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({ user_id: targetUserId, balance: 0 })
        .select('id, balance')
        .single();

      if (createError || !newWallet) {
        console.error('Wallet creation failed:', createError?.message);
        return new Response(
          JSON.stringify({ success: false, error: 'Unable to create wallet for user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      wallet = newWallet;
      console.log('Created new wallet for user:', targetUserId);
    } else {
      wallet = existingWallet;
    }

    // Amount is in Naira, convert to kobo for wallet
    const refundAmountInKobo = Math.round(refundAmount * 100);

    // Credit wallet
    const newBalance = wallet.balance + refundAmountInKobo;
    const { error: walletUpdateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', wallet.id);

    if (walletUpdateError) {
      console.error('Wallet credit failed:', walletUpdateError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to credit wallet' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        amount: refundAmountInKobo,
        type: 'refund',
        description: reason || 'Booking refund',
        booking_reference: booking.booking_reference,
      });

    if (transactionError) {
      console.error('Transaction record failed:', transactionError.message);
      // Non-critical - refund was successful
    }

    // Update booking status to refunded
    await supabase
      .from('bookings')
      .update({ payment_status: 'refunded' })
      .eq('id', bookingId);

    console.log('Refund processed successfully:', booking.booking_reference, 'Amount:', refundAmount);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Refund processed successfully',
        refundAmount: refundAmount,
        bookingReference: booking.booking_reference,
        newWalletBalance: newBalance / 100,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Refund processing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Unable to process refund' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
