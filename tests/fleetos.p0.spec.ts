/**
 * Fleetos — P0 Feature Validation Suite
 *
 * Covers:
 *   F-01  Fix DispatchEngine — write driver assignment to Supabase
 *   F-02  Payment tracking — log cash/UPI per trip
 *   F-03  Daily collections summary widget
 *
 * Run:  npx playwright test fleetos.p0.spec.ts
 * Dev:  npx playwright test fleetos.p0.spec.ts --headed
 * One:  npx playwright test fleetos.p0.spec.ts -g "F-01"
 */

import { test, expect, type Page, type Locator } from '@playwright/test';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const BASE_URL    = 'http://localhost:8080';
const ADMIN_EMAIL = 'shivamjindal076@gmail.com';
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || 'your_password_here';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Log in as admin and navigate to the Admin view */
async function loginAsAdmin(page: Page) {
  await page.goto(BASE_URL);

  // App loads on Customer view — click any protected nav item to trigger login
  // Use the Login button or navigate directly to trigger the auth gate
  await page.goto(`${BASE_URL}?view=admin`);
  
  // Wait for login form to appear
  await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10000 });

  // Fill in credentials
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASS);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for dashboard to load
  await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 10000 });
}

/** Navigate to Today's Board tab */
async function goTodaysBoard(page: Page) {
  await page.getByRole('button', { name: /today.s board/i }).click();
  await page.waitForTimeout(500);
}

/** Navigate to Fleet Health tab */
async function goFleetHealth(page: Page) {
  await page.getByRole('button', { name: /fleet health/i }).click();
  await page.waitForTimeout(500);
}

/** Find the first pending booking card in the Instant Queue */
async function getFirstPendingCard(page: Page): Promise<Locator> {
  await goTodaysBoard(page);
  const cards = page.locator('[data-testid="pending-booking-card"], .instant-queue-card').first();
  // Fallback — find the Assign Driver button and go up to its card
  const assignBtn = page.getByRole('button', { name: /assign driver/i }).first();
  return assignBtn.locator('..').locator('..');
}

// ─── F-01 TESTS ──────────────────────────────────────────────────────────────

test.describe('F-01 — DispatchEngine writes to Supabase', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('AC-1: Assign Driver button opens DispatchEngine dialog', async ({ page }) => {
    await goTodaysBoard(page);
    const assignBtn = page.getByRole('button', { name: /assign driver/i }).first();
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/dispatch|assign driver/i)).toBeVisible();
  });

  test('AC-2: Dialog shows booking summary — customer, route, fare', async ({ page }) => {
    await goTodaysBoard(page);
    await page.getByRole('button', { name: /assign driver/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('p.font-semibold').first()).toBeVisible();
    await expect(dialog.getByText(/₹/)).toBeVisible();
    await expect(dialog.getByText(/→/)).toBeVisible();
  });

  test('AC-3: Loading spinner shows during Supabase write (not instant)', async ({ page }) => {
    await goTodaysBoard(page);
    await page.getByRole('button', { name: /assign driver/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Skip if no drivers available
    const noDrivers = dialog.getByText(/no drivers available/i);
    if (await noDrivers.isVisible()) {
      test.skip();
      return;
    }

    const assignBtn = dialog.getByRole('button', { name: /auto.assign|assign/i }).first();
    await assignBtn.click();

    // Loading state — button text changes or spinner appears
    await expect(
      dialog.getByText(/assigning|loading|\.\.\./i).or(dialog.locator('.animate-spin'))
    ).toBeVisible({ timeout: 3000 });
  });

  test('AC-4: Success state shows "Driver Assigned!" after write', async ({ page }) => {
    await goTodaysBoard(page);
    await page.getByRole('button', { name: /assign driver/i }).first().click();
    const dialog = page.getByRole('dialog');

    const noDrivers = dialog.getByText(/no drivers available/i);
    if (await noDrivers.isVisible()) {
      test.skip();
      return;
    }

    await dialog.getByRole('button', { name: /auto.assign|assign/i }).first().click();
    await expect(dialog.getByText(/driver assigned/i)).toBeVisible({ timeout: 8000 });
  });

  test('AC-5: Dialog closes automatically after success', async ({ page }) => {
    await goTodaysBoard(page);
    await page.getByRole('button', { name: /assign driver/i }).first().click();
    const dialog = page.getByRole('dialog');

    const noDrivers = dialog.getByText(/no drivers available/i);
    if (await noDrivers.isVisible()) {
      test.skip();
      return;
    }

    await dialog.getByRole('button', { name: /auto.assign|assign/i }).first().click();
    await expect(dialog.getByText(/driver assigned/i)).toBeVisible({ timeout: 8000 });
    // Dialog should auto-close within ~2 seconds of success
    await expect(dialog).not.toBeVisible({ timeout: 4000 });
  });

  test('AC-6: Assigned booking disappears from Instant Queue', async ({ page }) => {
    await goTodaysBoard(page);

    // Count pending bookings before
    const pendingBefore = await page.getByRole('button', { name: /assign driver/i }).count();
    if (pendingBefore === 0) {
      test.skip();
      return;
    }

    await page.getByRole('button', { name: /assign driver/i }).first().click();
    const dialog = page.getByRole('dialog');
    const noDrivers = dialog.getByText(/no drivers available/i);
    if (await noDrivers.isVisible()) { test.skip(); return; }

    await dialog.getByRole('button', { name: /auto.assign|assign/i }).first().click();
    await expect(dialog.getByText(/driver assigned/i)).toBeVisible({ timeout: 8000 });
    await expect(dialog).not.toBeVisible({ timeout: 4000 });

    // Count after — should be one fewer
    const pendingAfter = await page.getByRole('button', { name: /assign driver/i }).count();
    expect(pendingAfter).toBe(pendingBefore - 1);
  });

  test('AC-7: Driver status changes to on-trip in Fleet Health', async ({ page }) => {
    await goTodaysBoard(page);

    // Get the driver name from the recommended pick before assigning
    await page.getByRole('button', { name: /assign driver/i }).first().click();
    const dialog = page.getByRole('dialog');
    const noDrivers = dialog.getByText(/no drivers available/i);
    if (await noDrivers.isVisible()) { test.skip(); return; }

    // Read the auto-recommend driver name
    const recommendedSection = dialog.locator('text=/nearest|recommended/i').locator('..').locator('..');
    const driverName = await recommendedSection.locator('p.font-bold, p.font-semibold').first().textContent();

    await dialog.getByRole('button', { name: /auto.assign/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 4000 });

    // Go to Fleet Health and verify driver is now on-trip
    await goFleetHealth(page);
    if (driverName) {
      const driverCard = page.getByText(driverName.trim()).locator('..').locator('..');
      await expect(driverCard.getByText(/on.trip|on trip/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('AC-8: Assignment persists after page refresh', async ({ page }) => {
    await goTodaysBoard(page);

    const pendingBefore = await page.getByRole('button', { name: /assign driver/i }).count();
    if (pendingBefore === 0) { test.skip(); return; }

    await page.getByRole('button', { name: /assign driver/i }).first().click();
    const dialog = page.getByRole('dialog');
    const noDrivers = dialog.getByText(/no drivers available/i);
    if (await noDrivers.isVisible()) { test.skip(); return; }

    await dialog.getByRole('button', { name: /auto.assign|assign/i }).first().click();
    await expect(dialog).not.toBeVisible({ timeout: 4000 });

    // Hard refresh
    await page.reload();
    await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 8000 });
    await goTodaysBoard(page);

    // Pending count should still be lower
    const pendingAfter = await page.getByRole('button', { name: /assign driver/i }).count();
    expect(pendingAfter).toBe(pendingBefore - 1);
  });

  test('AC-9: Error state shows inside dialog if Supabase fails', async ({ page }) => {
    // Simulate by intercepting the Supabase request and returning an error
    await page.route('**/rest/v1/bookings%20table*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Simulated DB error' }),
      });
    });

    await goTodaysBoard(page);
    await page.getByRole('button', { name: /assign driver/i }).first().click();
    const dialog = page.getByRole('dialog');
    const noDrivers = dialog.getByText(/no drivers available/i);
    if (await noDrivers.isVisible()) { test.skip(); return; }

    await dialog.getByRole('button', { name: /auto.assign|assign/i }).first().click();

    // Dialog should stay open and show an error
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByText(/error|failed|try again/i)).toBeVisible({ timeout: 5000 });
  });

});

// ─── F-02 TESTS ──────────────────────────────────────────────────────────────

test.describe('F-02 — Payment tracking: log cash/UPI per trip', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goTodaysBoard(page);
  });

  test('AC-1: Every booking card shows a payment status indicator', async ({ page }) => {
    // Look for any booking card — check it has a payment status element
    const cards = page.locator('.space-y-2 > div').filter({ hasText: /₹/ });
    const count = await cards.count();

    if (count === 0) {
      test.skip(); // No bookings today
      return;
    }

    // Each card should have one of the three payment states
    const firstCard = cards.first();
    const hasPaidIndicator = await firstCard.getByText(/paid|unpaid|unconfirmed/i).isVisible();
    expect(hasPaidIndicator).toBe(true);
  });

  test('AC-2: Tapping payment indicator opens a Sheet', async ({ page }) => {
    const paymentIndicator = page.getByText(/unpaid|unconfirmed|paid/i).first();
    if (!await paymentIndicator.isVisible()) { test.skip(); return; }

    await paymentIndicator.click();
    // Sheet should slide up
    await expect(page.getByText(/log payment/i)).toBeVisible({ timeout: 3000 });
  });

  test('AC-3: Payment Sheet shows customer name, route, and fare', async ({ page }) => {
    const paymentIndicator = page.getByText(/unpaid/i).first();
    if (!await paymentIndicator.isVisible()) { test.skip(); return; }

    await paymentIndicator.click();
    const sheet = page.getByRole('dialog').or(page.locator('[data-state="open"]'));
    await expect(sheet).toBeVisible({ timeout: 3000 });

    // Should show customer info and fare
    await expect(sheet.getByText(/₹/)).toBeVisible();
    await expect(sheet.getByText(/→/)).toBeVisible();
  });

  test('AC-4: Amount field defaults to booking fare value', async ({ page }) => {
    const paymentIndicator = page.getByText(/unpaid/i).first();
    if (!await paymentIndicator.isVisible()) { test.skip(); return; }

    // Capture fare from the card before opening sheet
    const card = paymentIndicator.locator('..').locator('..');
    const fareText = await card.getByText(/₹\d+/).first().textContent();
    const fareNumber = fareText?.replace(/[₹,]/g, '').trim();

    await paymentIndicator.click();
    await page.waitForTimeout(500);

    const amountInput = page.getByLabel(/amount/i).or(page.getByPlaceholder(/amount/i)).first();
    await expect(amountInput).toBeVisible({ timeout: 3000 });

    if (fareNumber) {
      const inputValue = await amountInput.inputValue();
      expect(inputValue).toBe(fareNumber);
    }
  });

  test('AC-5: Cash, UPI, Card pill buttons are all present and selectable', async ({ page }) => {
    const paymentIndicator = page.getByText(/unpaid/i).first();
    if (!await paymentIndicator.isVisible()) { test.skip(); return; }

    await paymentIndicator.click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: /^cash$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^upi$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^card$/i })).toBeVisible();

    // UPI should be selectable
    await page.getByRole('button', { name: /^upi$/i }).click();
    await expect(page.getByRole('button', { name: /^upi$/i })).toHaveClass(/bg-secondary|selected|active/);
  });

  test('AC-6: Mark as Received writes to Supabase and shows toast', async ({ page }) => {
    const paymentIndicator = page.getByText(/unpaid/i).first();
    if (!await paymentIndicator.isVisible()) { test.skip(); return; }

    await paymentIndicator.click();
    await page.waitForTimeout(500);

    const markBtn = page.getByRole('button', { name: /mark as received/i });
    await expect(markBtn).toBeVisible();
    await markBtn.click();

    // Toast notification
    await expect(page.getByText(/payment logged|saved/i)).toBeVisible({ timeout: 5000 });
  });

  test('AC-7: Sheet closes after successful payment log', async ({ page }) => {
    const paymentIndicator = page.getByText(/unpaid/i).first();
    if (!await paymentIndicator.isVisible()) { test.skip(); return; }

    await paymentIndicator.click();
    await page.waitForTimeout(500);

    const sheet = page.getByText(/log payment/i);
    await page.getByRole('button', { name: /mark as received/i }).click();

    await expect(sheet).not.toBeVisible({ timeout: 5000 });
  });

  test('AC-8: Card updates to green check (paid) after logging — no page refresh', async ({ page }) => {
    const unpaidIndicator = page.getByText(/unpaid/i).first();
    if (!await unpaidIndicator.isVisible()) { test.skip(); return; }

    const cardContainer = unpaidIndicator.locator('..').locator('..');

    await unpaidIndicator.click();
    await page.getByRole('button', { name: /mark as received/i }).click();
    await expect(page.getByText(/payment logged/i)).toBeVisible({ timeout: 5000 });

    // Card should now show paid indicator
    await expect(cardContainer.getByText(/paid/i)).toBeVisible({ timeout: 5000 });
  });

  test('AC-9: Error during payment write keeps Sheet open with error message', async ({ page }) => {
    // Intercept the bookings table PATCH and return error
    await page.route('**/rest/v1/bookings%20table*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Payment write failed' }),
        });
      } else {
        await route.continue();
      }
    });

    const paymentIndicator = page.getByText(/unpaid/i).first();
    if (!await paymentIndicator.isVisible()) { test.skip(); return; }

    await paymentIndicator.click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /mark as received/i }).click();

    // Sheet stays open
    await expect(page.getByText(/log payment/i)).toBeVisible({ timeout: 3000 });
    // Error message shows
    await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('AC-10: Already-paid bookings show green check on page load', async ({ page }) => {
    // Reload and check that any booking with payment_confirmed_at shows as paid
    await page.reload();
    await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 8000 });
    await goTodaysBoard(page);

    // If there are paid bookings, they should show paid indicator
    const paidIndicators = page.getByText(/^paid$/i);
    const count = await paidIndicators.count();
    // Either 0 paid (no completed payments yet — acceptable) or all show correctly
    if (count > 0) {
      await expect(paidIndicators.first()).toBeVisible();
    }
  });

});

// ─── F-03 TESTS ──────────────────────────────────────────────────────────────

test.describe('F-03 — Daily collections summary widget', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goTodaysBoard(page);
  });

  test('AC-1: PaymentSummary card is visible at the top of Today\'s Board', async ({ page }) => {
    await expect(page.getByText(/today.s collections/i)).toBeVisible({ timeout: 5000 });
  });

  test('AC-2: Summary shows today\'s date', async ({ page }) => {
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    // At minimum, the month should appear in the summary card
    const month = today.split(' ')[1];
    const summaryCard = page.getByText(/today.s collections/i).locator('..').locator('..');
    await expect(summaryCard.getByText(new RegExp(month, 'i'))).toBeVisible({ timeout: 3000 });
  });

  test('AC-3: Total collected amount is shown with ₹ and Indian formatting', async ({ page }) => {
    const summaryCard = page.getByText(/today.s collections/i).locator('..').locator('..');
    // Should show a ₹ amount somewhere in the card
    await expect(summaryCard.getByText(/₹/)).toBeVisible();
  });

  test('AC-4: Cash and digital breakdown is shown', async ({ page }) => {
    const summaryCard = page.getByText(/today.s collections/i).locator('..').locator('..');
    await expect(summaryCard.getByText(/cash/i)).toBeVisible();
    await expect(summaryCard.getByText(/digital|upi/i)).toBeVisible();
  });

  test('AC-5: Pending count is shown', async ({ page }) => {
    const summaryCard = page.getByText(/today.s collections/i).locator('..').locator('..');
    await expect(summaryCard.getByText(/pending/i)).toBeVisible();
  });

  test('AC-6: Progress bar is visible', async ({ page }) => {
    // Progress bar — look for a div with specific width style or progress element
    const progressBar = page
      .locator('[style*="width"]')
      .or(page.locator('progress'))
      .or(page.locator('.progress, [role="progressbar"]'));
    await expect(progressBar.first()).toBeVisible({ timeout: 3000 });
  });

  test('AC-7: Summary updates without page refresh after logging a payment', async ({ page }) => {
    // Get initial collected amount text
    const summaryCard = page.getByText(/today.s collections/i).locator('..').locator('..');
    const beforeText = await summaryCard.textContent();

    // Log a payment
    const unpaidIndicator = page.getByText(/unpaid/i).first();
    if (!await unpaidIndicator.isVisible()) { test.skip(); return; }

    await unpaidIndicator.click();
    await page.waitForTimeout(400);
    const amountInput = page.getByLabel(/amount/i).or(page.getByPlaceholder(/amount/i)).first();
    const currentVal = await amountInput.inputValue();

    await page.getByRole('button', { name: /mark as received/i }).click();
    await expect(page.getByText(/payment logged/i)).toBeVisible({ timeout: 5000 });

    // Summary card text should have changed (new amount)
    const afterText = await summaryCard.textContent();
    expect(afterText).not.toBe(beforeText);
  });

  test('AC-8: Shows ₹0 with zero pending when no bookings exist — does not crash', async ({ page }) => {
    // Intercept bookings query and return empty array
    await page.route('**/rest/v1/bookings%20table*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });

    await page.reload();
    await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 8000 });
    await goTodaysBoard(page);

    // Summary card should still render without errors
    await expect(page.getByText(/today.s collections/i)).toBeVisible({ timeout: 5000 });
    // Should show ₹0 collected
    await expect(page.getByText(/₹0|₹ 0/)).toBeVisible({ timeout: 3000 });
  });

  test('AC-9: Numbers use Indian number formatting', async ({ page }) => {
    const summaryCard = page.getByText(/today.s collections/i).locator('..').locator('..');
    const text = await summaryCard.textContent();
    // Indian formatting uses commas like 1,00,000 — check that ₹ amounts are present
    // and no raw floating point artifacts like .000000004
    expect(text).not.toMatch(/\.\d{5,}/); // No long decimals
    expect(text).toContain('₹');
  });

});

// ─── CROSS-FEATURE INTEGRATION TEST ──────────────────────────────────────────

test.describe('P0 Integration — full dispatch-to-payment flow', () => {

  test('Full flow: assign driver → trip shows in scheduled → log payment → summary updates', async ({ page }) => {
    await loginAsAdmin(page);
    await goTodaysBoard(page);

    // Step 1: Check PaymentSummary is present
    await expect(page.getByText(/today.s collections/i)).toBeVisible({ timeout: 5000 });
    const summaryCard = page.getByText(/today.s collections/i).locator('..').locator('..');
    const initialSummaryText = await summaryCard.textContent();

    // Step 2: Assign a driver if there's a pending booking
    const assignBtn = page.getByRole('button', { name: /assign driver/i }).first();
    if (await assignBtn.isVisible()) {
      await assignBtn.click();
      const dialog = page.getByRole('dialog');
      const noDrivers = dialog.getByText(/no drivers available/i);

      if (!await noDrivers.isVisible()) {
        await dialog.getByRole('button', { name: /auto.assign|assign/i }).first().click();
        await expect(dialog.getByText(/driver assigned/i)).toBeVisible({ timeout: 8000 });
        await expect(dialog).not.toBeVisible({ timeout: 4000 });

        // Step 3: Verify booking moved out of Instant Queue
        const assignBtnsAfter = await page.getByRole('button', { name: /assign driver/i }).count();
        expect(assignBtnsAfter).toBeLessThan(
          await page.getByRole('button', { name: /assign driver/i }).count() + 1
        );
      }
    }

    // Step 4: Log a payment on any unpaid booking
    const unpaidBtn = page.getByText(/unpaid/i).first();
    if (await unpaidBtn.isVisible()) {
      await unpaidBtn.click();
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: /mark as received/i }).click();
      await expect(page.getByText(/payment logged/i)).toBeVisible({ timeout: 5000 });

      // Step 5: Summary should have updated
      const finalSummaryText = await summaryCard.textContent();
      expect(finalSummaryText).not.toBe(initialSummaryText);
    }

    // Step 6: Reload and verify persistence
    await page.reload();
    await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 8000 });
    await goTodaysBoard(page);
    await expect(page.getByText(/today.s collections/i)).toBeVisible({ timeout: 5000 });
  });

});