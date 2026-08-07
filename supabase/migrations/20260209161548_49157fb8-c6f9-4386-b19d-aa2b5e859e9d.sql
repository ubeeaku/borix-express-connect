
-- Create enum for application status
CREATE TYPE public.driver_application_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Create enum for vehicle ownership
CREATE TYPE public.vehicle_ownership_type AS ENUM ('own_sienna', 'own_sharon', 'partnership');

-- Create driver applications table
CREATE TABLE public.driver_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  years_experience INTEGER NOT NULL DEFAULT 0,
  vehicle_ownership vehicle_ownership_type NOT NULL,
  vehicle_details TEXT,
  guarantor_name TEXT NOT NULL,
  guarantor_phone TEXT NOT NULL,
  guarantor_address TEXT,
  guarantor_relationship TEXT,
  bank_account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  drivers_license_url TEXT,
  nin_url TEXT,
  passport_photo_url TEXT,
  vehicle_papers_url TEXT,
  roadworthiness_url TEXT,
  status driver_application_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application (public form)
CREATE POLICY "Anyone can submit driver application"
ON public.driver_applications
FOR INSERT
WITH CHECK (true);

-- Only admins can view applications
CREATE POLICY "Admins can view all applications"
ON public.driver_applications
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can update applications
CREATE POLICY "Admins can update applications"
ON public.driver_applications
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Only admins can delete applications
CREATE POLICY "Admins can delete applications"
ON public.driver_applications
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_driver_applications_updated_at
BEFORE UPDATE ON public.driver_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_wallet_updated_at();

-- Create storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public) VALUES ('driver-documents', 'driver-documents', false);

-- Storage policies: anyone can upload (for application), only admins can view
CREATE POLICY "Anyone can upload driver documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'driver-documents');

-- Admins can view driver documents
CREATE POLICY "Admins can view driver documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'driver-documents' AND public.is_admin(auth.uid()));

-- Applicants need to read their own uploads during the form session
CREATE POLICY "Public read for driver documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'driver-documents');
