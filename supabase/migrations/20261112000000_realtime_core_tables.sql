-- Live updates for the tables the apps actually use.
-- The supabase_realtime publication only held the old tables ("Drivers", "bookings table", trips,
-- ...), so postgres_changes subscriptions on public.bookings (the driver app's 'driver-trips'
-- channel, and the owner's live notices) never fired. Add the real tables. Safe to run twice.
--
-- Access: Realtime applies each subscriber's row level security before sending a change. The
-- policies on these tables are unchanged by this file: only the fleet's own admins, and for
-- bookings / cash records the driver they belong to, can read rows, so customers and other
-- fleets receive nothing. No policy is added or widened here.

BEGIN;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bookings', 'drivers', 'driver_cash_entries', 'cash_handovers_v2'] LOOP
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
       ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;

-- bookings only: send the whole old row with each update and delete. With the default setting
-- an update's `old` holds just the id, which breaks two things:
--   1. the owner's notices compare old and new (trip_started_at newly set, status moved to
--      completed, payment newly logged);
--   2. the driver app checks payload.old.driver_id to notice a trip taken away from that
--      driver, and the org_id filter cannot match deletes.
-- It makes each bookings change write a little more to the log; the table is small.
-- drivers, driver_cash_entries and cash_handovers_v2 are only used to refresh lists, so they
-- keep the default.
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
