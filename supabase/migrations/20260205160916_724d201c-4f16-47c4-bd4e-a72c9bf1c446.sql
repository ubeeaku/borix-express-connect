-- Create wallets table for user balances
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet transactions table for audit trail
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  description TEXT,
  booking_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Wallet policies: Users can view their own wallet
CREATE POLICY "Users can view own wallet"
ON public.wallets FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all wallets
CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT
USING (is_admin(auth.uid()));

-- Only backend/admins can modify wallets (for security)
CREATE POLICY "Admins can insert wallets"
ON public.wallets FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update wallets"
ON public.wallets FOR UPDATE
USING (is_admin(auth.uid()));

-- Wallet transaction policies
CREATE POLICY "Users can view own transactions"
ON public.wallet_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wallets 
    WHERE wallets.id = wallet_transactions.wallet_id 
    AND wallets.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert transactions"
ON public.wallet_transactions FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Function to update wallet timestamps
CREATE OR REPLACE FUNCTION public.update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_wallet_updated_at();