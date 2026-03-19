CREATE POLICY "Allow authenticated users to insert bookings"
ON public."bookings table"
FOR INSERT
TO authenticated
WITH CHECK (true);