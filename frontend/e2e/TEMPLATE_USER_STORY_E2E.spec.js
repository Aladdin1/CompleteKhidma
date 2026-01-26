/**
 * E2E Test Template for User Story Verification
 * 
 * Location: frontend/e2e/user-stories/us-c-001.spec.js
 * 
 * This template uses Playwright for end-to-end testing
 * Copy this file and modify for specific user stories
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// USER STORY: US-C-001 - Client Registration with Phone Number
// ============================================================================

test.describe('US-C-001: Client Registration with Phone Number', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should display login page with phone input', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/login/);
    
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();
  });

  test('should verify OTP and redirect to dashboard', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/v1/auth/otp/request', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, expires_in: 600 }),
      });
    });

    await page.route('**/api/v1/auth/otp/verify', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '1', phone: '+201234567890', role: 'client' },
          tokens: { access_token: 'test-token', refresh_token: 'test-refresh' },
        }),
      });
    });

    // Request OTP
    const phoneInput = page.locator('input[type="tel"]');
    const submitButton = page.locator('button:has-text("إرسال رمز التحقق"), button:has-text("Send Verification Code")');
    await phoneInput.fill('+201234567890');
    await submitButton.click();
    
    // Enter OTP
    const otpInput = page.locator('input[maxlength="6"]');
    await expect(otpInput).toBeVisible({ timeout: 5000 });
    await otpInput.fill('123456');
    
    // Verify
    const verifyButton = page.locator('button:has-text("تحقق"), button:has-text("Verify")');
    await verifyButton.click();
    
    // Verify redirect
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 5000 });
  });
});

/**
 * Helper to login as a test user
 */
export async function loginAsClient(page, phone = '+201234567890', otp = '123456') {
  await page.route('**/api/v1/auth/otp/request', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, expires_in: 600 }),
    });
  });

  await page.route('**/api/v1/auth/otp/verify', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: '1', phone, role: 'client' },
        tokens: { access_token: 'test-token', refresh_token: 'test-refresh' },
      }),
    });
  });

  await page.goto('http://localhost:5173');
  
  const phoneInput = page.locator('input[type="tel"]');
  const submitButton = page.locator('button:has-text("إرسال رمز التحقق"), button:has-text("Send Verification Code")');
  await phoneInput.fill(phone);
  await submitButton.click();
  
  const otpInput = page.locator('input[maxlength="6"]');
  await expect(otpInput).toBeVisible({ timeout: 5000 });
  await otpInput.fill(otp);
  
  const verifyButton = page.locator('button:has-text("تحقق"), button:has-text("Verify")');
  await verifyButton.click();
  
  await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 5000 });
}
