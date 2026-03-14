
-- Allow public read access to Drivers table
CREATE POLICY "Allow public read access to Drivers"
ON public."Drivers"
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public read access to bookings table
CREATE POLICY "Allow public read access to bookings"
ON public."bookings table"
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public read access to fixed_routes table
CREATE POLICY "Allow public read access to fixed_routes"
ON public.fixed_routes
FOR SELECT
TO anon, authenticated
USING (true);
