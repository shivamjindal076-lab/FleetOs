/**
 * Playwright Global Setup — seeds Supabase with test data before the test run.
 *
 * Seeds 10 pending bookings and resets all drivers to 'free'
 * so every F-01 test has both a booking and an available driver.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vplydlocixunrnjlftbk.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwbHlkbG9jaXh1bnJuamxmdGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTMzMjcsImV4cCI6MjA4ODcyOTMyN30.tIF8B8Ckl3lzD_9IDaBLl24RFaGpAPux1Gz2gqHZ2tc';

const ADMIN_EMAIL = 'shivamjindal076@gmail.com';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'your_password_here';

const ROUTES = [
  { pickup: 'Sindhi Camp', drop: 'Jaipur Airport', fare: 450 },
  { pickup: 'MI Road', drop: 'Hawa Mahal', fare: 280 },
  { pickup: 'Ajmer Road', drop: 'Vaishali Nagar', fare: 320 },
  { pickup: 'Raja Park', drop: 'Mansarovar', fare: 190 },
  { pickup: 'Tonk Road', drop: 'Malviya Nagar', fare: 260 },
  { pickup: 'Jhotwara', drop: 'Civil Lines', fare: 350 },
  { pickup: 'C-Scheme', drop: 'Jagatpura', fare: 290 },
  { pickup: 'Sodala', drop: 'Bais Godam', fare: 180 },
  { pickup: 'Sanganer', drop: 'Pink Square', fare: 420 },
  { pickup: 'Kalwar Road', drop: 'World Trade Park', fare: 310 },
];

export default async function globalSetup() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  // Sign in as admin so RLS allows writes
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });

  if (signInError) {
    console.warn('[global-setup] Supabase sign-in failed:', signInError.message);
    console.warn('[global-setup] Tests that depend on pending bookings may fail.');
    return;
  }

  // Clean up previous test-seeded bookings
  const { error: deleteError } = await supabase
    .from('bookings table')
    .delete()
    .eq('source', 'playwright-seed');

  if (deleteError) {
    console.warn('[global-setup] Could not clean old seed data:', deleteError.message);
  }

  const todayISO = new Date().toISOString();

  // Insert 10 pending bookings
  const insertRows = ROUTES.map((r, i) => ({
    customer_name: `Test Customer ${i + 1}`,
    customer_phone: `+9198765${String(43210 + i).padStart(5, '0')}`,
    pickup: r.pickup,
    drop: r.drop,
    fare: r.fare,
    trip_type: 'city',
    status: 'pending',
    scheduled_at: todayISO,
    source: 'playwright-seed',
  }));

  const { error: insertError } = await supabase
    .from('bookings table')
    .insert(insertRows);

  if (insertError) {
    console.warn('[global-setup] Failed to insert test bookings:', insertError.message);
  } else {
    console.log(`[global-setup] Seeded ${insertRows.length} pending bookings.`);
  }

  // Reset ALL drivers to 'free' so every assignment test has an available driver
  const { data: drivers, error: fetchError } = await supabase
    .from('Drivers')
    .select('id')
    .limit(20);

  if (fetchError) {
    console.warn('[global-setup] Could not fetch drivers:', fetchError.message);
  } else if (drivers && drivers.length > 0) {
    const driverIds = drivers.map((d: any) => d.id);
    const { error: resetError } = await supabase
      .from('Drivers')
      .update({ status: 'free' })
      .in('id', driverIds);

    if (resetError) {
      console.warn('[global-setup] Failed to reset driver statuses:', resetError.message);
    } else {
      console.log(`[global-setup] Reset ${driverIds.length} driver(s) to free.`);
    }
  } else {
    console.warn('[global-setup] No drivers found in DB.');
  }

  await supabase.auth.signOut();
}
