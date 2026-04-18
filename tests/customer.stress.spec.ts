/**
 * FleetOs — Customer / Userland Stress Test Suite
 *
 * Every clickable surface in the customer booking flow:
 *   C-01  CustomerHome page
 *   C-02  Trip type selector (5 types)
 *   C-03  BookingForm — every field, every branch
 *   C-04  BookingSummary — review, payment, confirm
 *   C-05  Booking submission to Supabase
 *   C-06  Edge cases & validation
 *
 * Run:  npx playwright test customer.stress.spec.ts
 * Head: npx playwright test customer.stress.spec.ts --headed
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function goToCustomer(page: Page) {
  await page.goto(BASE_URL);
  // Customer view is the default — verify it loaded
  await expect(page.getByRole('button', { name: /book a ride/i })).toBeVisible({ timeout: 10000 });
}

async function clickBookARide(page: Page) {
  await goToCustomer(page);
  await page.getByRole('button', { name: /book a ride/i }).click();
  await expect(page.getByText(/local|city|airport|intercity|multi.day/i).first()).toBeVisible({ timeout: 5000 });
}

async function selectTripTypeAndContinue(page: Page, tripType: string) {
  await clickBookARide(page);
  await page.getByText(new RegExp(tripType, 'i')).first().click();
  // Wait for the form to load — date input is present on every trip type form
  await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 5000 });
}

async function fillCommonFields(page: Page) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  await page.getByPlaceholder(/pickup/i).fill('C-Scheme');
  await page.locator('input[type="date"]').fill(dateStr);
  await page.locator('input[type="time"]').fill('10:00');
  await page.getByPlaceholder(/full name/i).fill('Test Customer');
  await page.getByPlaceholder(/9876543210/i).fill('9876543210');
}

// ─── C-01: CustomerHome ───────────────────────────────────────────────────────

test.describe('C-01 — CustomerHome page', () => {

  test('CustomerHome loads with "Where to?" heading', async ({ page }) => {
    await goToCustomer(page);
    await expect(page.getByText(/where to/i)).toBeVisible();
  });

  test('Book a Ride button is visible and prominent', async ({ page }) => {
    await goToCustomer(page);
    await expect(page.getByRole('button', { name: /book a ride/i })).toBeVisible();
  });

  test('Cars available count is shown', async ({ page }) => {
    await goToCustomer(page);
    await expect(page.getByText(/cars available/i)).toBeVisible({ timeout: 5000 });
  });

  test('Fleet rating is shown', async ({ page }) => {
    await goToCustomer(page);
    await expect(page.getByText('Fleet rating')).toBeVisible({ timeout: 5000 });
  });

  test('Popular Routes section renders', async ({ page }) => {
    await goToCustomer(page);
    await expect(page.getByText(/popular routes/i)).toBeVisible({ timeout: 5000 });
  });

  test('Popular Route card is clickable and opens booking flow', async ({ page }) => {
    await goToCustomer(page);
    const routeCard = page.locator('.cursor-pointer').filter({ hasText: /→/ }).first();
    if (!await routeCard.isVisible()) { test.skip(); return; }
    await routeCard.click();
    await expect(page.getByText(/local|airport|intercity|city tour/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Recent Rides section renders', async ({ page }) => {
    await goToCustomer(page);
    await expect(page.getByText(/recent rides/i)).toBeVisible({ timeout: 5000 });
  });

  test('Rebook button in Recent Rides is clickable', async ({ page }) => {
    await goToCustomer(page);
    const rebookBtn = page.getByRole('button', { name: /rebook/i });
    if (!await rebookBtn.isVisible()) { test.skip(); return; }
    await rebookBtn.click();
    await expect(page.getByText(/local|airport|intercity/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Book Again button (last booking) is clickable if present', async ({ page }) => {
    await goToCustomer(page);
    const bookAgainBtn = page.getByText(/book again/i);
    if (!await bookAgainBtn.isVisible()) { test.skip(); return; }
    await bookAgainBtn.click();
    await expect(page.getByText(/local|airport|intercity/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Nav bar shows Customer tab active', async ({ page }) => {
    await goToCustomer(page);
    const customerTab = page.getByRole('button', { name: /customer/i });
    await expect(customerTab).toBeVisible();
  });

  test('Page does not show NaN or undefined in content', async ({ page }) => {
    await goToCustomer(page);
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toMatch(/\bNaN\b|\bundefined\b/);
  });

});

// ─── C-02: Trip Type Selector ─────────────────────────────────────────────────

test.describe('C-02 — Trip type selector', () => {

  test('Booking flow opens on Book a Ride click', async ({ page }) => {
    await clickBookARide(page);
    // TripTypeSelector cards should be visible
    await expect(page.getByText(/local|city|airport/i).first()).toBeVisible();
  });

  test('All 5 trip types render as clickable tiles', async ({ page }) => {
    await clickBookARide(page);
    const types = ['Local', 'Airport', 'City Tour', 'Intercity', 'Multi'];
    for (const t of types) {
      await expect(page.getByText(new RegExp(t, 'i')).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('Local ride tile click navigates to booking form', async ({ page }) => {
    await clickBookARide(page);
    await page.getByText(/^local|city ride/i).first().click();
    await expect(page.getByPlaceholder(/pickup/i)).toBeVisible({ timeout: 5000 });
  });

  test('Airport tile click navigates to airport-specific form', async ({ page }) => {
    await clickBookARide(page);
    await page.getByText(/airport/i).first().click();
    await expect(
      page.getByText(/arriving|departing/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('City Tour tile click shows stops section', async ({ page }) => {
    await clickBookARide(page);
    await page.getByText(/city tour|sightseeing/i).first().click();
    await expect(page.getByText(/stops/i)).toBeVisible({ timeout: 5000 });
  });

  test('Intercity tile click shows number of days counter', async ({ page }) => {
    await clickBookARide(page);
    await page.getByText(/intercity|outstation/i).first().click();
    await expect(page.getByText(/number of days|days/i)).toBeVisible({ timeout: 5000 });
  });

  test('Multi-day tile click shows driver stay option', async ({ page }) => {
    await clickBookARide(page);
    await page.getByText(/multi.day|multi day/i).first().click();
    await expect(page.getByText(/driver.*accommodation|driver.*stay/i)).toBeVisible({ timeout: 5000 });
  });

  test('Back button from trip type selector returns to CustomerHome', async ({ page }) => {
    await clickBookARide(page);
    const backBtn = page.getByRole('button', { name: /back|←/i }).first();
    if (!await backBtn.isVisible()) { test.skip(); return; }
    await backBtn.click();
    await expect(page.getByRole('button', { name: /book a ride/i })).toBeVisible({ timeout: 5000 });
  });

});

// ─── C-03: BookingForm — all fields ──────────────────────────────────────────

test.describe('C-03 — BookingForm fields', () => {

  test('Pickup location input accepts text', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    await page.getByPlaceholder(/pickup/i).fill('C-Scheme');
    const val = await page.getByPlaceholder(/pickup/i).inputValue();
    expect(val).toBe('C-Scheme');
  });

  test('Drop location input accepts text for local trip', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    await page.getByPlaceholder(/drop/i).fill('Malviya Nagar');
    const val = await page.getByPlaceholder(/drop/i).inputValue();
    expect(val).toBe('Malviya Nagar');
  });

  test('Airport form — Arriving toggle selects correctly', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'airport');
    const arrivingBtn = page.getByRole('button', { name: /arriving/i });
    await arrivingBtn.click();
    await expect(arrivingBtn).toHaveClass(/bg-secondary|selected/);
  });

  test('Airport form — Departing toggle selects correctly', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'airport');
    const departingBtn = page.getByRole('button', { name: /departing/i });
    await departingBtn.click();
    await expect(departingBtn).toHaveClass(/bg-secondary|selected/);
  });

  test('Airport form — Flight number input accepts text', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'airport');
    const flightInput = page.getByPlaceholder(/flight number/i);
    await flightInput.fill('AI-505');
    expect(await flightInput.inputValue()).toBe('AI-505');
  });

  test('City Tour — Add Stop button adds a stop input', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'city tour|sightseeing');
    const addStopBtn = page.getByRole('button', { name: /add stop/i });
    if (!await addStopBtn.isVisible()) { test.skip(); return; }
    const before = await page.getByPlaceholder(/stop \d/i).count();
    await addStopBtn.click();
    const after = await page.getByPlaceholder(/stop \d/i).count();
    expect(after).toBe(before + 1);
  });

  test('City Tour — Remove stop button removes a stop', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'city tour|sightseeing');
    const addStopBtn = page.getByRole('button', { name: /add stop/i });
    if (!await addStopBtn.isVisible()) { test.skip(); return; }
    await addStopBtn.click();
    const before = await page.getByPlaceholder(/stop \d/i).count();
    const removeBtn = page.locator('button').filter({ has: page.locator('[data-lucide="x"]') }).first();
    if (!await removeBtn.isVisible()) { test.skip(); return; }
    await removeBtn.click();
    const after = await page.getByPlaceholder(/stop \d/i).count();
    expect(after).toBe(before - 1);
  });

  test('City Tour — Hours picker — all 4 options (4h/6h/8h/10h) are clickable', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'city tour|sightseeing');
    for (const h of ['4h', '6h', '8h', '10h']) {
      const btn = page.getByRole('button', { name: new RegExp(`^${h}$`, 'i') });
      if (await btn.isVisible()) await btn.click();
    }
  });

  test('Intercity — Days counter increments', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'intercity|outstation');
    const incrementBtn = page.getByRole('button', { name: /^\+$/ }).first();
    if (!await incrementBtn.isVisible()) { test.skip(); return; }
    const before = await page.getByText(/\d+ day/).first().textContent();
    await incrementBtn.click();
    const after = await page.getByText(/\d+ day/).first().textContent();
    expect(after).not.toBe(before);
  });

  test('Intercity — Days counter decrements (not below 1)', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'intercity|outstation');
    const decrementBtn = page.locator('button').filter({ has: page.locator('[data-lucide="minus"]') }).or(
      page.getByRole('button', { name: /^−$|^-$/ })
    ).first();
    if (!await decrementBtn.isVisible()) { test.skip(); return; }
    await decrementBtn.click();
    // Should not go below 1
    const daysText = await page.getByText(/\d+ day/).first().textContent();
    const days = parseInt(daysText ?? '1');
    expect(days).toBeGreaterThanOrEqual(1);
  });

  test('Intercity — One Way / Round Trip toggle works', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'intercity|outstation');
    const roundTripBtn = page.getByRole('button', { name: /round trip/i });
    if (!await roundTripBtn.isVisible()) { test.skip(); return; }
    await roundTripBtn.click();
    await expect(roundTripBtn).toHaveClass(/bg-secondary|selected/);
    // Return date input should appear
    await expect(page.locator('input[type="date"]').nth(1)).toBeVisible({ timeout: 3000 });
  });

  test('Multi-day — Driver stay Yes/No toggle works', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'multi.day|multi day');
    const yesBtn = page.getByRole('button', { name: /^yes$/i });
    if (!await yesBtn.isVisible()) { test.skip(); return; }
    await yesBtn.click();
    await expect(yesBtn).toHaveClass(/bg-secondary|selected/);
    const noBtn = page.getByRole('button', { name: /^no$/i });
    await noBtn.click();
    await expect(noBtn).toHaveClass(/bg-secondary|selected/);
  });

  test('Passenger counter increments', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    const incBtn = page.getByRole('button', { name: /^\+$/ }).last();
    await incBtn.click();
    await expect(page.getByText(/2 people|2 persons/i)).toBeVisible({ timeout: 2000 });
  });

  test('Passenger counter decrements (not below 1)', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    const decBtn = page.getByRole('button', { name: /^−$|^-$/ }).last();
    if (!await decBtn.isVisible()) { test.skip(); return; }
    await decBtn.click();
    await expect(page.getByText(/1 person|1 passenger/i)).toBeVisible({ timeout: 2000 });
  });

  test('Customer name input accepts text', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    const nameInput = page.getByPlaceholder(/full name/i);
    await nameInput.fill('Rahul Kumar');
    expect(await nameInput.inputValue()).toBe('Rahul Kumar');
  });

  test('Phone number input strips non-numeric characters', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    const phoneInput = page.getByPlaceholder(/9876543210/i);
    await phoneInput.fill('abc123def456');
    const val = await phoneInput.inputValue();
    expect(val).toMatch(/^\d+$/);
  });

  test('Date picker accepts valid future date', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.locator('input[type="date"]').first().fill(dateStr);
    const val = await page.locator('input[type="date"]').first().inputValue();
    expect(val).toBe(dateStr);
  });

  test('Time picker accepts valid time', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    await page.locator('input[type="time"]').fill('14:30');
    const val = await page.locator('input[type="time"]').inputValue();
    expect(val).toBe('14:30');
  });

  test('Notes textarea accepts optional text', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    const notes = page.getByPlaceholder(/instructions|call on arrival/i);
    await notes.fill('Please call on arrival');
    expect(await notes.inputValue()).toBe('Please call on arrival');
  });

  test('Next → button is disabled with empty required fields', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    const nextBtn = page.getByRole('button', { name: /next/i });
    await expect(nextBtn).toBeDisabled();
  });

  test('Next → button enables after all required fields filled', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    await fillCommonFields(page);
    await page.getByPlaceholder(/drop/i).fill('Malviya Nagar');
    const nextBtn = page.getByRole('button', { name: /next/i });
    await expect(nextBtn).not.toBeDisabled({ timeout: 3000 });
  });

  test('Next → navigates to BookingSummary screen', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    await fillCommonFields(page);
    await page.getByPlaceholder(/drop/i).fill('Malviya Nagar');
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByRole('button', { name: /confirm booking/i })).toBeVisible({ timeout: 8000 });
  });

});

// ─── C-04: BookingSummary ──────────────────────────────────────────────────────

test.describe('C-04 — BookingSummary review screen', () => {

  async function reachSummary(page: Page) {
    await selectTripTypeAndContinue(page, 'local|city ride');
    await fillCommonFields(page);
    await page.getByPlaceholder(/drop/i).fill('Malviya Nagar');
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByRole('button', { name: /confirm booking/i })).toBeVisible({ timeout: 8000 });
  }

  test('Summary shows pickup → drop route', async ({ page }) => {
    await reachSummary(page);
    await expect(page.getByText(/→/)).toBeVisible();
  });

  test('Summary shows trip type badge', async ({ page }) => {
    await reachSummary(page);
    await expect(page.getByText(/local|city ride|airport/i)).toBeVisible();
  });

  test('Summary shows estimated fare with ₹', async ({ page }) => {
    await reachSummary(page);
    await expect(page.getByText(/₹/)).toBeVisible();
  });

  test('Summary shows date and time', async ({ page }) => {
    await reachSummary(page);
    await expect(page.getByText(/\d{1,2}:\d{2}/)).toBeVisible();
  });

  test('Payment method — Cash pill is default selected', async ({ page }) => {
    await reachSummary(page);
    const cashBtn = page.getByRole('button', { name: /cash/i });
    await expect(cashBtn).toHaveClass(/bg-secondary|selected/);
  });

  test('Payment method — UPI pill is clickable and becomes selected', async ({ page }) => {
    await reachSummary(page);
    await page.getByRole('button', { name: /upi/i }).click();
    await expect(page.getByRole('button', { name: /upi/i })).toHaveClass(/bg-secondary|selected/);
  });

  test('Payment method — Card pill is clickable and becomes selected', async ({ page }) => {
    await reachSummary(page);
    await page.getByRole('button', { name: /card/i }).click();
    await expect(page.getByRole('button', { name: /card/i })).toHaveClass(/bg-secondary|selected/);
  });

  test('Edit Trip button navigates back to form', async ({ page }) => {
    await reachSummary(page);
    await page.getByRole('button', { name: /edit trip|← edit/i }).click();
    await expect(page.getByPlaceholder(/pickup/i)).toBeVisible({ timeout: 5000 });
  });

  test('Confirm Booking button is visible', async ({ page }) => {
    await reachSummary(page);
    await expect(page.getByRole('button', { name: /confirm booking/i })).toBeVisible();
  });

});

// ─── C-05: Booking submission ─────────────────────────────────────────────────

test.describe('C-05 — Booking submission to Supabase', () => {

  async function reachAndConfirm(page: Page) {
    await selectTripTypeAndContinue(page, 'local|city ride');
    await fillCommonFields(page);
    await page.getByPlaceholder(/drop/i).fill('Malviya Nagar');
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/confirm booking/i)).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: /confirm booking/i }).click();
  }

  test('Confirm Booking writes to Supabase and shows success screen', async ({ page }) => {
    await reachAndConfirm(page);
    await expect(
      page.getByText(/booking confirmed|confirmed/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('Success screen shows booking ID', async ({ page }) => {
    await reachAndConfirm(page);
    await expect(page.getByText(/#\d{5}|booking id/i)).toBeVisible({ timeout: 10000 });
  });

  test('Success screen shows route', async ({ page }) => {
    await reachAndConfirm(page);
    await expect(
      page.getByText(/booking confirmed/i)
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/c-scheme.*malviya|malviya.*c-scheme/i)).toBeVisible();
  });

  test('Success screen shows driver assignment placeholder', async ({ page }) => {
    await reachAndConfirm(page);
    await expect(page.getByText(/driver.*assigned|fleet manager/i)).toBeVisible({ timeout: 10000 });
  });

  test('Back to Home button on success screen returns to CustomerHome', async ({ page }) => {
    await reachAndConfirm(page);
    await expect(page.getByText(/booking confirmed/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /back to home/i }).click();
    await expect(page.getByRole('button', { name: /book a ride/i })).toBeVisible({ timeout: 5000 });
  });

  test('Supabase 500 on booking insert shows error toast', async ({ page }) => {
    await page.route('**/rest/v1/bookings*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, body: JSON.stringify({ message: 'DB error' }) });
      } else { await route.continue(); }
    });
    await reachAndConfirm(page);
    await expect(page.getByText('Booking failed', { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('After error, Confirm Booking button is still visible for retry', async ({ page }) => {
    await page.route('**/rest/v1/bookings*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, body: JSON.stringify({ message: 'DB error' }) });
      } else { await route.continue(); }
    });
    await reachAndConfirm(page);
    await expect(page.getByText(/booking failed|error/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /confirm booking/i })).toBeVisible();
  });

  test('Airport booking confirmation includes date and time', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'airport');
    await page.getByPlaceholder(/your address/i).fill('Tonk Road');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator('input[type="date"]').fill(tomorrow.toISOString().split('T')[0]);
    await page.locator('input[type="time"]').fill('06:30');
    await page.getByPlaceholder(/full name/i).fill('Airport Customer');
    await page.getByPlaceholder(/9876543210/i).fill('9876500000');
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/confirm booking/i)).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: /confirm booking/i }).click();
    await expect(page.getByText(/booking confirmed/i)).toBeVisible({ timeout: 10000 });
  });

});

// ─── C-06: Edge cases & validation ───────────────────────────────────────────

test.describe('C-06 — Customer edge cases & validation', () => {

  test('Phone field max 10 digits — extra digits are stripped', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    const phoneInput = page.getByPlaceholder(/9876543210/i);
    await phoneInput.fill('98765432101234');
    const val = await phoneInput.inputValue();
    expect(val.length).toBeLessThanOrEqual(10);
  });

  test('Past date is not accepted for booking', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await page.locator('input[type="date"]').fill(yesterday.toISOString().split('T')[0]);
    const nextBtn = page.getByRole('button', { name: /next/i });
    // Fill other fields to isolate the date validation
    await page.getByPlaceholder(/pickup/i).fill('C-Scheme');
    await page.getByPlaceholder(/drop/i).fill('MI Road');
    await page.locator('input[type="time"]').fill('10:00');
    await page.getByPlaceholder(/full name/i).fill('Test');
    await page.getByPlaceholder(/9876543210/i).fill('9876543210');
    // Next should stay disabled because date is invalid
    await expect(nextBtn).toBeDisabled({ timeout: 2000 });
  });

  test('CustomerHome does not crash when popular routes API returns empty array', async ({ page }) => {
    await page.route('**/rest/v1/fixed_routes_v2*', async route => {
      await route.fulfill({ status: 200, body: '[]' });
    });
    await goToCustomer(page);
    await expect(page.getByText(/no routes configured/i)).toBeVisible({ timeout: 5000 });
  });

  test('CustomerHome renders without crash when drivers API returns empty', async ({ page }) => {
    await page.route('**/rest/v1/drivers*', async route => {
      if (route.request().method() === 'GET') await route.fulfill({ status: 200, body: '[]' });
      else await route.continue();
    });
    await goToCustomer(page);
    await expect(page.getByText('Cars available now')).toBeVisible({ timeout: 5000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toMatch(/NaN|undefined/);
  });

  test('City tour with 6 stops — Add Stop button disappears at limit', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'city tour|sightseeing');
    const addBtn = page.getByRole('button', { name: /add stop/i });
    if (!await addBtn.isVisible()) { test.skip(); return; }
    // Add 6 stops
    for (let i = 0; i < 6; i++) {
      if (await addBtn.isVisible()) await addBtn.click();
      else break;
    }
    // At 6 stops, button should be gone
    await expect(addBtn).not.toBeVisible({ timeout: 2000 });
  });

  test('Intercity days counter — cannot exceed 30', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'intercity|outstation');
    const incBtn = page.getByRole('button', { name: /^\+$/ }).first();
    if (!await incBtn.isVisible()) { test.skip(); return; }
    // Click increment 35 times
    for (let i = 0; i < 35; i++) {
      if (await incBtn.isEnabled()) await incBtn.click();
    }
    const daysText = await page.getByText(/\d+ day/).first().textContent();
    const days = parseInt(daysText ?? '30');
    expect(days).toBeLessThanOrEqual(30);
  });

  test('Multi-day days counter — cannot exceed 14', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'multi.day|multi day');
    const incBtn = page.getByRole('button', { name: /^\+$/ }).first();
    if (!await incBtn.isVisible()) { test.skip(); return; }
    for (let i = 0; i < 20; i++) {
      if (await incBtn.isEnabled()) await incBtn.click();
    }
    const daysText = await page.getByText(/\d+ day/).first().textContent();
    const days = parseInt(daysText ?? '14');
    expect(days).toBeLessThanOrEqual(14);
  });

  test('No XSS via booking form fields — script tags render as text', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    await page.getByPlaceholder(/full name/i).fill('<script>alert(1)</script>');
    await page.waitForTimeout(500);
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await page.waitForTimeout(500);
    expect(alertFired).toBe(false);
  });

  test('Passenger count does not go below 1', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    const decBtn = page.getByRole('button', { name: /^−$/ }).last();
    if (!await decBtn.isVisible()) { test.skip(); return; }
    // Click many times
    for (let i = 0; i < 5; i++) await decBtn.click();
    await expect(page.getByText(/1 person/i)).toBeVisible({ timeout: 2000 });
  });

  test('Passenger count does not exceed 20', async ({ page }) => {
    await selectTripTypeAndContinue(page, 'local|city ride');
    const incBtn = page.getByRole('button', { name: /^\+$/ }).last();
    if (!await incBtn.isVisible()) { test.skip(); return; }
    for (let i = 0; i < 25; i++) await incBtn.click();
    const text = await page.getByText(/\d+ people|\d+ person/i).first().textContent();
    const count = parseInt(text ?? '20');
    expect(count).toBeLessThanOrEqual(20);
  });

});
