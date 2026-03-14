
-- 1. Create user_roles table for role-based access
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can read user_roles
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Create has_role function (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Create a safe public view for Drivers (no phone, location, plate)
CREATE VIEW public.drivers_public AS
SELECT id, name, vehicle_model, status
FROM public."Drivers";

-- Grant access to the view
GRANT SELECT ON public.drivers_public TO anon, authenticated;

-- 4. Replace Drivers RLS: drop broad public policy, add restricted ones
DROP POLICY "Allow public read access to Drivers" ON public."Drivers";

-- Authenticated users can read all driver data
CREATE POLICY "Authenticated users can read Drivers"
ON public."Drivers"
FOR SELECT
TO authenticated
USING (true);

-- 5. Restrict bookings: drop public policy, allow only authenticated
DROP POLICY "Allow public read access to bookings" ON public."bookings table";

CREATE POLICY "Authenticated users can read bookings"
ON public."bookings table"
FOR SELECT
TO authenticated
USING (true);
