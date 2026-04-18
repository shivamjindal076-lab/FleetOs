ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS upi_qr_url text,
  ADD COLUMN IF NOT EXISTS google_review_url text;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS driver_confirmed_at timestamptz;
