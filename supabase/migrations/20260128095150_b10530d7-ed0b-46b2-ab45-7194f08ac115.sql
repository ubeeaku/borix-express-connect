-- Add next of kin columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN next_of_kin_name TEXT,
ADD COLUMN next_of_kin_phone TEXT;