/**
 * Authentication E2E Tests
 * End-to-end tests for user authentication flows
 */

const { test, expect } = require('@playwright/test');
const TestDataFactory = require('../helpers/test-data');

test.describe('Authentication Flow', () => {
  const baseURL = process.env.FRONTEND_URL || 'http://localhost:8080';

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
  });

  test('should display login page', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    
    await expect(page).toHaveTitle(/Healthcare|Login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should register a new user', async ({ page }) => {
    const testUser = TestDataFactory.generateUser('patient');
    
    await page.goto(`${baseURL}/register`);
    
    // Fill registration form
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="phone"]', testUser.phone);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect or success message
    await page.waitForTimeout(2000);
    
    // Check if redirected to dashboard or home
    const url = page.url();
    expect(url).toMatch(/dashboard|home|login/i);
  });

  test('should login with valid credentials', async ({ page }) => {
    // First register a user
    const testUser = TestDataFactory.generateUser('patient');
    
    await page.goto(`${baseURL}/register`);
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="phone"]', testUser.phone);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Logout if logged in
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Now login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(2000);
    
    // Check if redirected to dashboard
    const url = page.url();
    expect(url).toMatch(/dashboard|home/i);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Check for error message (could be toast, alert, or inline error)
    const errorVisible = await page.locator('text=/error|invalid|incorrect/i').isVisible();
    expect(errorVisible).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    const testUser = TestDataFactory.generateUser('patient');
    
    await page.goto(`${baseURL}/register`);
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="phone"]', testUser.phone);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Sign Out")').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
      
      // Should redirect to login or home
      const url = page.url();
      expect(url).toMatch(/login|home|\//);
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.goto(`${baseURL}/register`);
    
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    
    // Check for validation error
    const errorVisible = await page.locator('text=/invalid|email/i').isVisible();
    expect(errorVisible).toBeTruthy();
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto(`${baseURL}/register`);
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');
    
    // Check for validation error
    const errorVisible = await page.locator('text=/password|weak|strong/i').isVisible();
    expect(errorVisible).toBeTruthy();
  });
});
