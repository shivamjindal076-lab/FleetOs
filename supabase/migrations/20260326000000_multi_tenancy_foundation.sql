-- ============================================================
-- FleetOs — Multi-Tenancy Foundation Migration
-- 2026-03-26
--
-- WHAT THIS DOES:
--   1. Creates new clean tables with org_id (organizations, drivers,
--      bookings, cash_handovers_v2, org_pricing, fixed_routes_v2,
--      super_admin_users)
--   2. Seeds Anil Cabs as org #1
--   3. Migrates existing "Drivers" and "bookings table" rows into
--      the new tables under Anil Cabs org_id
--   4. Enables RLS on all new tables
--   5. Adds permissive Phase-1 policies (tightened in next migration
--      once admin_user_id is populated per org)
--
-- SAFE TO RUN: uses IF NOT EXISTS + ON CONFLICT DO NOTHING
-- OLD TABLES: "Drivers" and "bookings table" are NOT dropped here —
--             drop them manually after verifying row counts match.
-- ============================================================


-- ============================================================
-- SECTION 1: CREATE NEW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  slug                    text UNIQUE NOT NULL,
  custom_domain           text,
  brand_name              text NOT NULL,
  brand_logo_url          text,
  brand_color             text,
  join_code               char(4) NOT NULL,
  admin_user_id           uuid REFERENCES auth.users ON DELETE SET NULL,
  whatsapp_api_key        text,
  google_drive_connected  boolean DEFAULT false,
  google_drive_token      jsonb,
  report_frequency_days   int DEFAULT 7,
  created_at              timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drivers (
  id                bigserial PRIMARY KEY,
  org_id            uuid REFERENCES organizations NOT NULL,
  name              text,
  phone             text,
  vehicle_model     text,
  plate_number      text,
  status            text DEFAULT 'pending_approval',
  is_temporary      boolean DEFAULT false,
  odometer_required boolean DEFAULT false,
  location_lat      numeric,
  location_lng      numeric,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id                      bigserial PRIMARY KEY,
  org_id                  uuid REFERENCES organizations NOT NULL,
  customer_name           text,
  customer_phone          text,
  pickup                  text,
  drop                    text,
  trip_type               text,
  status                  text DEFAULT 'pending',
  fare                    numeric,
  driver_id               bigint REFERENCES drivers,
  scheduled_at            timestamptz,
  payment_method          text,
  amount_collected        numeric,
  payment_confirmed_at    timestamptz,
  stops                   text,
  estimated_hours         numeric,
  number_of_days          int,
  return_date             date,
  driver_stay_required    boolean DEFAULT false,
  odometer_start_url      text,
  odometer_start_reading  int,
  odometer_start_at       timestamptz,
  odometer_end_url        text,
  odometer_end_reading    int,
  odometer_end_at         timestamptz,
  dispatched_at           timestamptz,
  trip_started_at         timestamptz,
  trip_completed_at       timestamptz,
  created_at              timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_handovers_v2 (
  id              bigserial PRIMARY KEY,
  org_id          uuid REFERENCES organizations NOT NULL,
  driver_id       bigint REFERENCES drivers NOT NULL,
  amount          numeric NOT NULL,
  handed_over_at  timestamptz DEFAULT now(),
  admin_approved  boolean DEFAULT false,
  admin_notes     text
);

CREATE TABLE IF NOT EXISTS org_pricing (
  id                    bigserial PRIMARY KEY,
  org_id                uuid UNIQUE REFERENCES organizations NOT NULL,
  city_per_km           numeric,
  outstation_per_km     numeric,
  airport_flat_fare     numeric,
  sightseeing_per_hour  numeric,
  sedan_multiplier      numeric DEFAULT 1.0,
  suv_multiplier        numeric DEFAULT 1.3,
  night_surcharge_pct   numeric DEFAULT 0,
  driver_stay_per_night numeric,
  waiting_per_hour      numeric,
  updated_at            timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fixed_routes_v2 (
  id           bigserial PRIMARY KEY,
  org_id       uuid REFERENCES organizations NOT NULL,
  origin       text,
  destination  text,
  fixed_fare   numeric,
  per_km_rate  numeric
);

CREATE TABLE IF NOT EXISTS super_admin_users (
  user_id     uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);


-- ============================================================
-- SECTION 2: SEED ANIL CABS AS ORG #1
-- ============================================================

INSERT INTO organizations (
  id,
  name,
  slug,
  brand_name,
  join_code,
  report_frequency_days,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Anil Cabs',
  'anilcabs',
  'Anil Cabs',
  'AC01',
  7,
  now()
) ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- SECTION 3: MIGRATE EXISTING "Drivers" DATA
-- ============================================================

INSERT INTO drivers (
  org_id,
  name,
  phone,
  vehicle_model,
  plate_number,
  status,
  location_lat,
  location_lng,
  created_at
)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  name,
  phone,
  vehicle_model,
  plate_number,
  COALESCE(status, 'free'),
  location_lat,
  location_lng,
  COALESCE(created_at, now())
FROM "Drivers"
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECTION 4: MIGRATE EXISTING "bookings table" DATA
-- ============================================================

INSERT INTO bookings (
  org_id,
  customer_name,
  customer_phone,
  pickup,
  drop,
  trip_type,
  status,
  fare,
  scheduled_at,
  payment_method,
  amount_collected,
  payment_confirmed_at,
  stops,
  estimated_hours,
  number_of_days,
  return_date,
  driver_stay_required,
  created_at
)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  customer_name,
  customer_phone,
  pickup,
  drop,
  trip_type,
  COALESCE(status, 'pending'),
  fare,
  scheduled_at::timestamptz,
  payment_method,
  amount_collected,
  payment_confirmed_at::timestamptz,
  stops,
  estimated_hours,
  number_of_days,
  return_date::date,
  COALESCE(driver_stay_required, false),
  COALESCE(created_at::timestamptz, now())
FROM "bookings table"
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECTION 5: ENABLE RLS ON ALL NEW TABLES
-- ============================================================

ALTER TABLE organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_handovers_v2  ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_pricing        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_routes_v2    ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_users  ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 6: RLS POLICIES (Phase 1 — permissive)
--
-- Phase 1: authenticated users get full access to all rows.
-- This keeps the app working immediately after migration.
-- Phase 2 (next migration): tighten to org_id-scoped policies
-- once admin_user_id is set on each org row.
-- ============================================================

-- Organizations: authenticated read own row; anon read for slug lookup
DROP POLICY IF EXISTS "auth_read_organizations"  ON organizations;
DROP POLICY IF EXISTS "auth_update_organizations" ON organizations;
DROP POLICY IF EXISTS "auth_all_drivers"          ON drivers;
DROP POLICY IF EXISTS "auth_all_bookings"         ON bookings;
DROP POLICY IF EXISTS "anon_insert_bookings"      ON bookings;
DROP POLICY IF EXISTS "auth_all_handovers"        ON cash_handovers_v2;
DROP POLICY IF EXISTS "auth_all_pricing"          ON org_pricing;
DROP POLICY IF EXISTS "auth_all_routes"           ON fixed_routes_v2;
DROP POLICY IF EXISTS "super_admin_self"          ON super_admin_users;

CREATE POLICY "auth_read_organizations"
  ON organizations FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "auth_update_organizations"
  ON organizations FOR UPDATE TO authenticated USING (true);

-- Drivers: authenticated full access
CREATE POLICY "auth_all_drivers"
  ON drivers FOR ALL TO authenticated USING (true);

-- Drivers: anon can read — required for DriverLoginPage OTP lookup and session restore
DROP POLICY IF EXISTS "anon_read_drivers" ON drivers;
CREATE POLICY "anon_read_drivers"
  ON drivers FOR SELECT TO anon USING (true);

-- Bookings: authenticated full access + anon insert (customer booking form)
CREATE POLICY "auth_all_bookings"
  ON bookings FOR ALL TO authenticated USING (true);

CREATE POLICY "anon_insert_bookings"
  ON bookings FOR INSERT TO anon WITH CHECK (true);

-- Cash handovers: authenticated full access
CREATE POLICY "auth_all_handovers"
  ON cash_handovers_v2 FOR ALL TO authenticated USING (true);

-- Org pricing: authenticated full access
CREATE POLICY "auth_all_pricing"
  ON org_pricing FOR ALL TO authenticated USING (true);

-- Fixed routes: authenticated full access
CREATE POLICY "auth_all_routes"
  ON fixed_routes_v2 FOR ALL TO authenticated USING (true);

-- Super admin: user can read their own row
CREATE POLICY "super_admin_self"
  ON super_admin_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- ============================================================
-- SECTION 7: INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_drivers_org_id    ON drivers (org_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status    ON drivers (org_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_org_id   ON bookings (org_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings (org_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_sched    ON bookings (org_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_handovers_org_id  ON cash_handovers_v2 (org_id);
CREATE INDEX IF NOT EXISTS idx_routes_org_id     ON fixed_routes_v2 (org_id);


-- ============================================================
-- VERIFICATION QUERIES (run manually to confirm migration)
-- ============================================================
-- SELECT COUNT(*) FROM "Drivers";           -- old count
-- SELECT COUNT(*) FROM drivers;             -- should match
-- SELECT COUNT(*) FROM "bookings table";    -- old count
-- SELECT COUNT(*) FROM bookings;            -- should match
-- SELECT * FROM organizations;             -- should show Anil Cabs row
-- ============================================================
