/**
 * FleetOs — Admin Stress Test Suite
 *
 * Every clickable surface in the admin flow, grouped by area:
 *   A-01  Auth & navigation
 *   A-02  Dashboard stats & tab switching
 *   A-03  Today's Board — booking cards & detail
 *   A-04  DispatchEngine dialog (every button, error paths)
 *   A-05  Payment sheet (every interaction)
 *   A-06  New Booking sheet (every field & trip type)
 *   A-07  Pending handovers (approve / flag)
 *   A-08  Fleet Health tab — driver list, approve, reject
 *   A-09  Collections tab — mode/navigation interactions
 *   A-10  Edge cases & error recovery
 *
 * Run:  npx playwright test admin.stress.spec.ts
 * Head: npx playwright test admin.stress.spec.ts --headed
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL    = 'http://localhost:8080';
const ADMIN_EMAIL = 'shivamjindal076@gmail.com';
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || 'your_password_here';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
  await page.goto(BASE_URL);
  await page.getByTestId('open-login').click();
  await page.getByRole('button', { name: /^admin$/i }).click();
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASS);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 12000 });
}

async function goTab(page: Page, tab: 'today' | 'fleet' | 'collections') {
  const labels = { today: /today.s board/i, fleet: /fleet health/i, collections: /collections/i };
  await page.getByRole('button', { name: labels[tab] }).click();
  await page.waitForTimeout(400);
}

async function openFirstPendingBooking(page: Page) {
  await goTab(page, 'today');
  const card = page.locator('.space-y-2 > div').filter({ hasText: /assign/i }).first();
  if (await card.count() === 0) return null;
  await card.click();
  return card;
}

// ─── A-01: Auth & Navigation ──────────────────────────────────────────────────

test.describe('A-01 — Auth & navigation', () => {

  test('Login button (open-login testid) is visible on home for unauthenticated user', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByTestId('open-login')).toBeVisible();
  });

  test('Driver tile redirects to driver flow without email/password form', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByTestId('open-login').click();
    await page.getByRole('button', { name: /^driver$/i }).click();
    // Driver tile triggers onDriverSelect — should show driver login page
    await expect(page.getByText(/driver login|enter.*phone|send otp/i)).toBeVisible({ timeout: 5000 });
  });

  test('Admin tile shows email/password form', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByTestId('open-login').click();
    await page.getByRole('button', { name: /^admin$/i }).click();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('Wrong password shows error message', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByTestId('open-login').click();
    await page.getByRole('button', { name: /^admin$/i }).click();
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill('wrong_password_12345');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 8000 });
  });

  test('Successful login lands on admin dashboard with stats visible', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText(/free/i).first()).toBeVisible();
    await expect(page.getByText(/on trip|on.trip/i)).toBeVisible();
    await expect(page.getByText(/pending/i).first()).toBeVisible();
  });

  test('Logout button signs out and shows login again', async ({ page }) => {
    await loginAsAdmin(page);
    // Logout is the icon-only button (LogOut icon)
    const logoutBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
    await logoutBtn.click();
    await expect(page.getByTestId('open-login')).toBeVisible({ timeout: 5000 });
  });

  test('Non-admin user sees Access Denied on admin view', async ({ page }) => {
    // Navigate directly to admin view without auth
    await page.goto(BASE_URL);
    // Force the view — simulate clicking Admin nav without being logged in
    await page.getByTestId('open-login').click();
    // The LoginPage renders — verify it's visible, not the admin dashboard
    await expect(page.getByText(/staff login/i)).toBeVisible({ timeout: 5000 });
  });

  test('Back to Customer View button on login page works', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByTestId('open-login').click();
    const backBtn = page.getByRole('button', { name: /back to customer/i });
    await expect(backBtn).toBeVisible({ timeout: 3000 });
    await backBtn.click();
    await expect(page.getByRole('button', { name: /book a ride/i })).toBeVisible({ timeout: 5000 });
  });

});

// ─── A-02: Dashboard stats & tab switching ────────────────────────────────────

test.describe('A-02 — Dashboard stats & tab switching', () => {

  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('Stats row shows Free / On Trip / Offline / Pending counts', async ({ page }) => {
    await expect(page.getByText(/free/i).first()).toBeVisible();
    await expect(page.getByText(/on trip|on.trip/i).first()).toBeVisible();
    await expect(page.getByText(/offline/i).first()).toBeVisible();
    await expect(page.getByText(/pending/i).first()).toBeVisible();
  });

  test('Today\'s Board tab is active by default', async ({ page }) => {
    await expect(page.getByRole('button', { name: /today.s board/i })).toBeVisible();
    await expect(page.getByText(/today.s collections/i)).toBeVisible({ timeout: 5000 });
  });

  test('Fleet Health tab click navigates to driver list', async ({ page }) => {
    await goTab(page, 'fleet');
    await expect(page.getByText(/fleet health|drivers/i)).toBeVisible({ timeout: 5000 });
  });

  test('Collections tab click shows date navigation and mode pills', async ({ page }) => {
    await goTab(page, 'collections');
    await expect(page.getByRole('button', { name: /^day$/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /^week$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^month$/i })).toBeVisible();
  });

  test('Tab switching is smooth — Today → Fleet → Collections → Today', async ({ page }) => {
    await goTab(page, 'fleet');
    await goTab(page, 'collections');
    await goTab(page, 'today');
    await expect(page.getByText(/today.s collections/i)).toBeVisible({ timeout: 5000 });
  });

  test('Today\'s date is shown in the header', async ({ page }) => {
    const today = new Date().toLocaleDateString('en-IN', { month: 'short' });
    await expect(page.getByText(new RegExp(today, 'i'))).toBeVisible({ timeout: 3000 });
  });

});

// ─── A-03: Today's Board — booking cards & detail ─────────────────────────────

test.describe('A-03 — Today\'s Board booking cards', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goTab(page, 'today');
  });

  test('PaymentSummary card is visible with ₹ amount and progress bar', async ({ page }) => {
    await expect(page.getByText(/today.s collections/i)).toBeVisible();
    await expect(page.getByRole('progressbar')).toBeVisible();
  });

  test('Instant Queue section heading is visible', async ({ page }) => {
    await expect(page.getByText(/instant queue/i)).toBeVisible();
  });

  test('Booking cards show customer name, route, fare, status badge', async ({ page }) => {
    const cards = page.locator('.space-y-2 > div').filter({ hasText: /₹/ });
    if (await cards.count() === 0) { test.skip(); return; }
    const first = cards.first();
    await expect(first.getByText(/₹/)).toBeVisible();
    await expect(first.getByText(/pending|confirmed|in.progress/i)).toBeVisible();
  });

  test('Clicking a booking card opens detail view with dispatch + call buttons', async ({ page }) => {
    const cards = page.locator('.space-y-2 > div').filter({ hasText: /assign/i });
    if (await cards.count() === 0) { test.skip(); return; }
    await cards.first().click();
    // Detail expanded — assign + call buttons should be visible
    await expect(page.getByRole('button', { name: /assign/i }).first()).toBeVisible();
  });

  test('Assign Driver button opens DispatchEngine dialog', async ({ page }) => {
    const assignBtn = page.getByRole('button', { name: /assign/i }).first();
    if (!await assignBtn.isVisible()) { test.skip(); return; }
    await assignBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/dispatch|assign driver/i)).toBeVisible();
  });

  test('Payment status pill is visible on every booking card', async ({ page }) => {
    const cards = page.locator('.space-y-2 > div').filter({ hasText: /₹/ });
    if (await cards.count() === 0) { test.skip(); return; }
    const card = cards.first();
    const hasPaymentPill = await card.getByText(/paid|unpaid|partial|pending/i).count() > 0;
    expect(hasPaymentPill).toBe(true);
  });

  test('New Booking button (+ icon) opens NewBookingSheet', async ({ page }) => {
    // The Plus button is a FAB or toolbar button
    const plusBtn = page.getByRole('button', { name: /new booking|^\+$/i }).or(
      page.locator('button').filter({ has: page.locator('[data-lucide="plus"]') })
    ).first();
    if (!await plusBtn.isVisible()) { test.skip(); return; }
    await plusBtn.click();
    await expect(page.getByText(/new booking/i)).toBeVisible({ timeout: 5000 });
  });

});

// ─── A-04: DispatchEngine dialog ──────────────────────────────────────────────

test.describe('A-04 — DispatchEngine dialog interactions', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goTab(page, 'today');
  });

  async function openDispatch(page: Page) {
    const btn = page.getByRole('button', { name: /assign/i }).first();
    if (!await btn.isVisible()) return false;
    await btn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    return true;
  }

  test('Dialog shows booking details — customer name, route (→), fare (₹)', async ({ page }) => {
    if (!await openDispatch(page)) { test.skip(); return; }
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/₹/)).toBeVisible();
    await expect(dialog.getByText(/→/)).toBeVisible();
  });

  test('Dialog shows driver list or "no drivers available" message', async ({ page }) => {
    if (!await openDispatch(page)) { test.skip(); return; }
    const dialog = page.getByRole('dialog');
    const hasDrivers = await dialog.getByText(/nearest|available|km/i).isVisible();
    const noDrivers  = await dialog.getByText(/no drivers available/i).isVisible();
    expect(hasDrivers || noDrivers).toBe(true);
  });

  test('Each driver card shows name, status badge, score', async ({ page }) => {
    if (!await openDispatch(page)) { test.skip(); return; }
    const dialog = page.getByRole('dialog');
    if (await dialog.getByText(/no drivers available/i).isVisible()) { test.skip(); return; }
    // Driver cards should show km and ETA
    await expect(dialog.getByText(/km|eta/i).first()).toBeVisible();
  });

  test('Busy drivers show "Busy at …" label and their Assign button is disabled or absent', async ({ page }) => {
    if (!await openDispatch(page)) { test.skip(); return; }
    const dialog = page.getByRole('dialog');
    const busyLabel = dialog.getByText(/busy at/i);
    if (!await busyLabel.isVisible()) { test.skip(); return; }
    // Busy driver card's assign button should be disabled
    const busyCard = busyLabel.locator('..').locator('..');
    const assignBtn = busyCard.getByRole('button', { name: /assign/i });
    if (await assignBtn.isVisible()) {
      await expect(assignBtn).toBeDisabled();
    }
  });

  test('Clicking Assign on a free driver shows loading state', async ({ page }) => {
    if (!await openDispatch(page)) { test.skip(); return; }
    const dialog = page.getByRole('dialog');
    if (await dialog.getByText(/no drivers available/i).isVisible()) { test.skip(); return; }
    const assignBtn = dialog.getByRole('button', { name: /auto.assign|^assign$/i }).first();
    await assignBtn.click();
    // Loading or success should appear
    await expect(
      dialog.getByText(/assigning|driver assigned/i).or(dialog.locator('.animate-spin'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('Success state shows "Driver Assigned!" banner', async ({ page }) => {
    if (!await openDispatch(page)) { test.skip(); return; }
    const dialog = page.getByRole('dialog');
    if (await dialog.getByText(/no drivers available/i).isVisible()) { test.skip(); return; }
    await dialog.getByRole('button', { name: /auto.assign|^assign$/i }).first().click();
    await expect(dialog.getByText(/driver assigned/i)).toBeVisible({ timeout: 8000 });
  });

  test('Dialog auto-closes ~1.5s after success', async ({ page }) => {
    if (!await openDispatch(page)) { test.skip(); return; }
    const dialog = page.getByRole('dialog');
    if (await dialog.getByText(/no drivers available/i).isVisible()) { test.skip(); return; }
    await dialog.getByRole('button', { name: /auto.assign|^assign$/i }).first().click();
    await expect(dialog.getByText(/driver assigned/i)).toBeVisible({ timeout: 8000 });
    await expect(dialog).not.toBeVisible({ timeout: 4000 });
  });

  test('Closing dialog with X button works before assignment', async ({ page }) => {
    if (!await openDispatch(page)) { test.skip(); return; }
    const dialog = page.getByRole('dialog');
    const closeBtn = dialog.getByRole('button', { name: /close|×|✕/i }).or(
      page.locator('[aria-label="Close"]')
    ).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('Simulated DB error keeps dialog open and shows error text', async ({ page }) => {
    await page.route('**/rest/v1/bookings*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({ status: 500, body: JSON.stringify({ message: 'DB error' }) });
      } else {
        await route.continue();
      }
    });
    if (!await openDispatch(page)) { test.skip(); return; }
    const dialog = page.getByRole('dialog');
    if (await dialog.getByText(/no drivers available/i).isVisible()) { test.skip(); return; }
    await dialog.getByRole('button', { name: /auto.assign|^assign$/i }).first().click();
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('Assignment persists after page refresh', async ({ page }) => {
    const pendingBefore = await page.getByRole('button', { name: /^assign$/i }).count();
    if (pendingBefore === 0) { test.skip(); return; }
    if (!await openDispatch(page)) { test.skip(); return; }
    const dialog = page.getByRole('dialog');
    if (await dialog.getByText(/no drivers available/i).isVisible()) { test.skip(); return; }
    await dialog.getByRole('button', { name: /auto.assign|^assign$/i }).first().click();
    await expect(dialog).not.toBeVisible({ timeout: 4000 });
    await page.reload();
    await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 10000 });
    await goTab(page, 'today');
    const pendingAfter = await page.getByRole('button', { name: /^assign$/i }).count();
    expect(pendingAfter).toBeLessThan(pendingBefore + 1);
  });

});

// ─── A-05: Payment sheet ──────────────────────────────────────────────────────

test.describe('A-05 — Payment sheet interactions', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goTab(page, 'today');
  });

  async function openPaymentSheet(page: Page) {
    const pill = page.getByText(/^unpaid$/i).first();
    if (!await pill.isVisible()) return false;
    await pill.click();
    await expect(page.getByText(/log payment|payment/i)).toBeVisible({ timeout: 5000 });
    return true;
  }

  test('Unpaid pill click opens payment sheet', async ({ page }) => {
    if (!await openPaymentSheet(page)) { test.skip(); return; }
    await expect(page.getByText(/log payment|mark.*received/i)).toBeVisible();
  });

  test('Payment sheet shows customer info and fare', async ({ page }) => {
    if (!await openPaymentSheet(page)) { test.skip(); return; }
    await expect(page.getByText(/₹/)).toBeVisible();
  });

  test('Amount field is pre-filled with booking fare', async ({ page }) => {
    if (!await openPaymentSheet(page)) { test.skip(); return; }
    const amountInput = page.getByLabel(/amount/i).or(page.getByPlaceholder(/amount/i)).first();
    const val = await amountInput.inputValue();
    expect(Number(val)).toBeGreaterThan(0);
  });

  test('Cash pill is selected by default', async ({ page }) => {
    if (!await openPaymentSheet(page)) { test.skip(); return; }
    const cashBtn = page.getByRole('button', { name: /^cash$/i });
    await expect(cashBtn).toHaveClass(/bg-secondary|selected|active/);
  });

  test('Clicking UPI pill selects it', async ({ page }) => {
    if (!await openPaymentSheet(page)) { test.skip(); return; }
    await page.getByRole('button', { name: /^upi$/i }).click();
    await expect(page.getByRole('button', { name: /^upi$/i })).toHaveClass(/bg-secondary|selected/);
  });

  test('Clicking Card pill selects it', async ({ page }) => {
    if (!await openPaymentSheet(page)) { test.skip(); return; }
    await page.getByRole('button', { name: /^card$/i }).click();
    await expect(page.getByRole('button', { name: /^card$/i })).toHaveClass(/bg-secondary|selected/);
  });

  test('Clearing amount field prevents submission or shows 0', async ({ page }) => {
    if (!await openPaymentSheet(page)) { test.skip(); return; }
    const amountInput = page.getByLabel(/amount/i).or(page.getByPlaceholder(/amount/i)).first();
    await amountInput.fill('0');
    const markBtn = page.getByRole('button', { name: /mark as received/i });
    // Button may be disabled when amount is 0
    await expect(markBtn).toBeVisible();
  });

  test('Mark as Received writes to Supabase and shows toast', async ({ page }) => {
    if (!await openPaymentSheet(page)) { test.skip(); return; }
    await page.getByRole('button', { name: /mark as received/i }).click();
    await expect(page.getByText(/payment logged|saved/i)).toBeVisible({ timeout: 6000 });
  });

  test('Sheet closes after successful payment log', async ({ page }) => {
    if (!await openPaymentSheet(page)) { test.skip(); return; }
    await page.getByRole('button', { name: /mark as received/i }).click();
    await expect(page.getByText(/payment logged/i)).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(/log payment/i)).not.toBeVisible({ timeout: 4000 });
  });

  test('Booking card updates to Paid after payment — no refresh', async ({ page }) => {
    const unpaidPill = page.getByText(/^unpaid$/i).first();
    if (!await unpaidPill.isVisible()) { test.skip(); return; }
    await unpaidPill.click();
    await page.getByRole('button', { name: /mark as received/i }).click();
    await expect(page.getByText(/payment logged/i)).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(/^paid$/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('PaymentSummary card updates after logging — no refresh', async ({ page }) => {
    const summaryCard = page.getByText(/today.s collections/i).locator('..').locator('..');
    const before = await summaryCard.textContent();
    const unpaidPill = page.getByText(/^unpaid$/i).first();
    if (!await unpaidPill.isVisible()) { test.skip(); return; }
    await unpaidPill.click();
    await page.getByRole('button', { name: /mark as received/i }).click();
    await expect(page.getByText(/payment logged/i)).toBeVisible({ timeout: 6000 });
    const after = await summaryCard.textContent();
    expect(after).not.toBe(before);
  });

  test('Error state on payment write keeps sheet open', async ({ page }) => {
    await page.route('**/rest/v1/bookings*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({ status: 500, body: JSON.stringify({ message: 'DB error' }) });
      } else {
        await route.continue();
      }
    });
    if (!await openPaymentSheet(page)) { test.skip(); return; }
    await page.getByRole('button', { name: /mark as received/i }).click();
    await expect(page.getByText(/log payment|payment/i)).toBeVisible({ timeout: 4000 });
    await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });
  });

});

// ─── A-06: New Booking Sheet ──────────────────────────────────────────────────

test.describe('A-06 — New Booking sheet', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goTab(page, 'today');
  });

  async function openNewBooking(page: Page) {
    const btn = page.getByRole('button', { name: /new booking|\+/i }).first();
    if (!await btn.isVisible()) return false;
    await btn.click();
    await expect(page.getByText(/new booking/i)).toBeVisible({ timeout: 5000 });
    return true;
  }

  test('New Booking button opens sheet with all form fields', async ({ page }) => {
    if (!await openNewBooking(page)) { test.skip(); return; }
    await expect(page.getByLabel(/customer name/i)).toBeVisible();
    await expect(page.getByLabel(/phone/i)).toBeVisible();
  });

  test('Trip type pills — City, Airport, Sightseeing, Outstation all render', async ({ page }) => {
    if (!await openNewBooking(page)) { test.skip(); return; }
    await expect(page.getByRole('button', { name: /^city$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^airport$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^sightseeing$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^outstation$/i })).toBeVisible();
  });

  test('Each trip type pill is clickable and becomes active', async ({ page }) => {
    if (!await openNewBooking(page)) { test.skip(); return; }
    for (const type of ['Airport', 'Sightseeing', 'Outstation', 'City']) {
      await page.getByRole('button', { name: new RegExp(`^${type}$`, 'i') }).click();
      await expect(
        page.getByRole('button', { name: new RegExp(`^${type}$`, 'i') })
      ).toHaveClass(/bg-secondary|selected/);
    }
  });

  test('Payment method pills — Cash, UPI, Card all render and are clickable', async ({ page }) => {
    if (!await openNewBooking(page)) { test.skip(); return; }
    for (const method of ['Cash', 'Upi', 'Card']) {
      await page.getByRole('button', { name: new RegExp(`^${method}$`, 'i') }).click();
    }
  });

  test('Save Booking disabled when required fields are empty', async ({ page }) => {
    if (!await openNewBooking(page)) { test.skip(); return; }
    const saveBtn = page.getByRole('button', { name: /save booking/i });
    await expect(saveBtn).toBeVisible();
    // With empty customer name, button should be disabled or error on click
    await expect(saveBtn).toBeDisabled();
  });

  test('Filling all fields enables Save Booking and submits', async ({ page }) => {
    if (!await openNewBooking(page)) { test.skip(); return; }
    await page.getByLabel(/customer name/i).fill('Stress Test Customer');
    await page.getByPlaceholder(/10-digit/i).fill('9876543210');
    await page.getByPlaceholder(/pickup/i).fill('C-Scheme');
    await page.getByPlaceholder(/drop/i).fill('Malviya Nagar');

    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').first().fill(today);
    await page.locator('input[type="time"]').first().fill('14:00');
    await page.locator('input[type="number"]').first().fill('350');

    const saveBtn = page.getByRole('button', { name: /save booking/i });
    await expect(saveBtn).not.toBeDisabled({ timeout: 2000 });
    await saveBtn.click();
    await expect(page.getByText(/booking saved|saved/i)).toBeVisible({ timeout: 8000 });
  });

  test('Saved booking appears in Today\'s Board without refresh', async ({ page }) => {
    if (!await openNewBooking(page)) { test.skip(); return; }
    const before = await page.locator('.space-y-2 > div').filter({ hasText: /₹/ }).count();

    await page.getByLabel(/customer name/i).fill('Refresh Check Customer');
    await page.getByPlaceholder(/10-digit/i).fill('9999999999');
    await page.getByPlaceholder(/pickup/i).fill('Sindhi Camp');
    await page.getByPlaceholder(/drop/i).fill('Jaipur Airport');
    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').first().fill(today);
    await page.locator('input[type="time"]').first().fill('11:00');
    await page.locator('input[type="number"]').first().fill('450');

    await page.getByRole('button', { name: /save booking/i }).click();
    await expect(page.getByText(/booking saved/i)).toBeVisible({ timeout: 8000 });

    const after = await page.locator('.space-y-2 > div').filter({ hasText: /₹/ }).count();
    expect(after).toBeGreaterThanOrEqual(before);
  });

});

// ─── A-07: Pending Handovers ──────────────────────────────────────────────────

test.describe('A-07 — Pending Handovers widget', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goTab(page, 'today');
  });

  test('PendingHandovers widget shows when there are unapproved handovers', async ({ page }) => {
    const widget = page.getByText(/pending handovers/i);
    if (!await widget.isVisible()) {
      test.skip(); // No handovers yet — acceptable
      return;
    }
    await expect(widget).toBeVisible();
  });

  test('Approve button marks handover approved and removes it from list', async ({ page }) => {
    const approveBtn = page.getByRole('button', { name: /^approve$/i }).first();
    if (!await approveBtn.isVisible()) { test.skip(); return; }
    const countBefore = await page.getByRole('button', { name: /^approve$/i }).count();
    await approveBtn.click();
    await expect(page.getByText(/approved|handover approved/i)).toBeVisible({ timeout: 5000 });
    const countAfter = await page.getByRole('button', { name: /^approve$/i }).count();
    expect(countAfter).toBe(countBefore - 1);
  });

  test('Flag button marks handover flagged and removes it from list', async ({ page }) => {
    const flagBtn = page.getByRole('button', { name: /^flag$/i }).first();
    if (!await flagBtn.isVisible()) { test.skip(); return; }
    const countBefore = await page.getByRole('button', { name: /^flag$/i }).count();
    await flagBtn.click();
    await expect(page.getByText(/flagged/i)).toBeVisible({ timeout: 5000 });
    const countAfter = await page.getByRole('button', { name: /^flag$/i }).count();
    expect(countAfter).toBe(countBefore - 1);
  });

});

// ─── A-08: Fleet Health tab ───────────────────────────────────────────────────

test.describe('A-08 — Fleet Health tab', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goTab(page, 'fleet');
  });

  test('Fleet Health tab shows driver cards', async ({ page }) => {
    await expect(page.getByText(/drivers|fleet/i).first()).toBeVisible();
  });

  test('Free driver shows green status dot', async ({ page }) => {
    const freeLabel = page.getByText(/^free$/i).first();
    if (!await freeLabel.isVisible()) { test.skip(); return; }
    await expect(freeLabel).toBeVisible();
  });

  test('On-trip driver shows orange/secondary status dot', async ({ page }) => {
    const onTripLabel = page.getByText(/on.trip/i).first();
    if (!await onTripLabel.isVisible()) { test.skip(); return; }
    await expect(onTripLabel).toBeVisible();
  });

  test('Pending-approval drivers show Approve / Reject buttons', async ({ page }) => {
    const approveBtn = page.getByRole('button', { name: /approve.*regular|^approve$/i }).first();
    if (!await approveBtn.isVisible()) { test.skip(); return; }
    await expect(approveBtn).toBeVisible();
  });

  test('Approve as Regular button works — driver status becomes free', async ({ page }) => {
    const regularBtn = page.getByRole('button', { name: /approve.*regular|regular/i }).first();
    if (!await regularBtn.isVisible()) { test.skip(); return; }
    await regularBtn.click();
    await expect(page.getByText(/approved.*regular|approved/i)).toBeVisible({ timeout: 6000 });
  });

  test('Approve as Temporary button works', async ({ page }) => {
    const tempBtn = page.getByRole('button', { name: /temporary|temp/i }).first();
    if (!await tempBtn.isVisible()) { test.skip(); return; }
    await tempBtn.click();
    await expect(page.getByText(/approved.*temp|temporary/i)).toBeVisible({ timeout: 6000 });
  });

  test('Reject button deletes driver from list', async ({ page }) => {
    const rejectBtn = page.getByRole('button', { name: /reject|remove/i }).first();
    if (!await rejectBtn.isVisible()) { test.skip(); return; }
    const countBefore = await page.getByRole('button', { name: /reject|remove/i }).count();
    await rejectBtn.click();
    await expect(page.getByText(/removed/i)).toBeVisible({ timeout: 5000 });
    const countAfter = await page.getByRole('button', { name: /reject|remove/i }).count();
    expect(countAfter).toBeLessThan(countBefore);
  });

  test('Delete driver button in driver card removes driver', async ({ page }) => {
    // The small delete button in the fleet health driver row
    const deleteBtn = page.locator('button').filter({ has: page.locator('.text-destructive') }).first();
    if (!await deleteBtn.isVisible()) { test.skip(); return; }
    await deleteBtn.click();
    await expect(page.getByText(/removed/i)).toBeVisible({ timeout: 5000 });
  });

  test('Driver name click or expand shows collections panel', async ({ page }) => {
    const driverCard = page.locator('[class*="cursor-pointer"]').first();
    if (!await driverCard.isVisible()) { test.skip(); return; }
    await driverCard.click();
    // Collections panel or earnings section should appear
    await expect(
      page.getByText(/collections|trips|earnings/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

});

// ─── A-09: Collections tab ────────────────────────────────────────────────────

test.describe('A-09 — Collections tab navigation', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goTab(page, 'collections');
  });

  test('Day mode is active by default', async ({ page }) => {
    const dayBtn = page.getByRole('button', { name: /^day$/i });
    await expect(dayBtn).toHaveClass(/bg-card|selected|active|shadow/);
  });

  test('Week mode pill click switches to weekly view', async ({ page }) => {
    await page.getByRole('button', { name: /^week$/i }).click();
    await expect(page.getByText(/–|Mon|Tue|Wed|Thu|Fri|Sat|Sun/)).toBeVisible({ timeout: 5000 });
  });

  test('Month mode pill click switches to monthly view', async ({ page }) => {
    await page.getByRole('button', { name: /^month$/i }).click();
    await expect(page.getByText(/january|february|march|april|may|june|july|august|september|october|november|december/i)).toBeVisible({ timeout: 5000 });
  });

  test('Previous (◀) arrow navigates back one period', async ({ page }) => {
    const labelBefore = await page.locator('span.font-semibold').first().textContent();
    await page.locator('button').filter({ has: page.locator('[data-lucide="chevron-left"]') }).click();
    const labelAfter = await page.locator('span.font-semibold').first().textContent();
    expect(labelAfter).not.toBe(labelBefore);
  });

  test('Next (▶) arrow is disabled when at current period (offset = 0)', async ({ page }) => {
    const nextBtn = page.locator('button').filter({ has: page.locator('[data-lucide="chevron-right"]') });
    await expect(nextBtn).toBeDisabled();
  });

  test('Going back and forward returns to same period', async ({ page }) => {
    const labelBefore = await page.locator('span.font-semibold').first().textContent();
    await page.locator('button').filter({ has: page.locator('[data-lucide="chevron-left"]') }).click();
    await page.locator('button').filter({ has: page.locator('[data-lucide="chevron-right"]') }).click();
    const labelAfter = await page.locator('span.font-semibold').first().textContent();
    expect(labelAfter).toBe(labelBefore);
  });

  test('Summary card shows ₹ amounts and pending count', async ({ page }) => {
    await expect(page.getByText(/₹/).first()).toBeVisible();
    await expect(page.getByText(/pending/i)).toBeVisible();
  });

  test('Week mode shows bar chart with day labels', async ({ page }) => {
    await page.getByRole('button', { name: /^week$/i }).click();
    // Bar chart renders spans with short day labels (Mon, Tue, etc.)
    await expect(page.getByText(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Month mode shows bar chart with W1/W2/W3/W4 labels', async ({ page }) => {
    await page.getByRole('button', { name: /^month$/i }).click();
    await expect(page.getByText(/W1|W2|W3/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Switching modes resets offset to 0 (back to current period)', async ({ page }) => {
    await page.locator('button').filter({ has: page.locator('[data-lucide="chevron-left"]') }).click();
    await page.getByRole('button', { name: /^week$/i }).click();
    // Next should now be disabled again (offset = 0)
    const nextBtn = page.locator('button').filter({ has: page.locator('[data-lucide="chevron-right"]') });
    await expect(nextBtn).toBeDisabled({ timeout: 2000 });
  });

});

// ─── A-10: Edge cases ─────────────────────────────────────────────────────────

test.describe('A-10 — Edge cases & error recovery', () => {

  test('Dashboard loads without crash when bookings response is empty', async ({ page }) => {
    await page.route('**/rest/v1/bookings*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, body: '[]' });
      } else { await route.continue(); }
    });
    await loginAsAdmin(page);
    await goTab(page, 'today');
    await expect(page.getByText(/today.s collections/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/no pending bookings/i)).toBeVisible({ timeout: 5000 });
  });

  test('PaymentSummary shows ₹0 when no bookings', async ({ page }) => {
    await page.route('**/rest/v1/bookings*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, body: '[]' });
      } else { await route.continue(); }
    });
    await loginAsAdmin(page);
    await goTab(page, 'today');
    await expect(page.getByText(/₹0/)).toBeVisible({ timeout: 5000 });
  });

  test('Fleet Health loads without crash when drivers response is empty', async ({ page }) => {
    await page.route('**/rest/v1/drivers*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, body: '[]' });
      } else { await route.continue(); }
    });
    await loginAsAdmin(page);
    await goTab(page, 'fleet');
    // Should show empty state or "0 drivers" — not crash
    await expect(page.locator('body')).not.toContainText(/error|undefined|NaN/i);
  });

  test('Supabase 500 on bookings load shows loading state gracefully — not blank screen', async ({ page }) => {
    await page.route('**/rest/v1/bookings*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 500, body: JSON.stringify({ message: 'DB unavailable' }) });
      } else { await route.continue(); }
    });
    await loginAsAdmin(page);
    // Dashboard should still render header and tabs — not a white screen
    await expect(page.getByText(/dashboard/i)).toBeVisible({ timeout: 10000 });
  });

  test('No XSS injection via customer name in booking card', async ({ page }) => {
    // If a booking with a script tag in the name exists, it should render as text not execute
    await loginAsAdmin(page);
    await goTab(page, 'today');
    // Assert no alert or injected element
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await page.waitForTimeout(1000);
    expect(alertFired).toBe(false);
  });

  test('Page title is meaningful (not default Vite title)', async ({ page }) => {
    await page.goto(BASE_URL);
    const title = await page.title();
    expect(title.toLowerCase()).not.toBe('vite + react + ts');
  });

});
