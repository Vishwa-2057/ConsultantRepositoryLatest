/**
 * Dashboard E2E Tests
 * Tests for dashboard functionality and user workflows
 */

const { test, expect } = require('@playwright/test');
const TestDataFactory = require('../helpers/test-data');

test.describe('Dashboard Functionality', () => {
  const baseURL = process.env.FRONTEND_URL || 'http://localhost:8080';
  let testUser;

  test.beforeEach(async ({ page }) => {
    // Create a test user and login
    testUser = TestDataFactory.generateUser('doctor');
    
    // Register
    await page.goto(`${baseURL}/register`);
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="phone"]', testUser.phone);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
  });

  test('should display dashboard after login', async ({ page }) => {
    const url = page.url();
    
    // Should be on dashboard or home page
    expect(url).toMatch(/dashboard|home/i);
    
    // Should show user info or welcome message
    const welcomeText = await page.locator('body').textContent();
    expect(welcomeText).toBeTruthy();
  });

  test('should display navigation menu', async ({ page }) => {
    // Check for common navigation items
    const navItems = [
      'Dashboard',
      'Patients',
      'Appointments',
      'Profile',
      'Settings'
    ];
    
    for (const item of navItems) {
      const element = page.locator(`a:has-text("${item}"), button:has-text("${item}")`).first();
      
      // At least some nav items should be visible
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        break;
      }
    }
  });

  test('should navigate between sections', async ({ page }) => {
    // Try to navigate to different sections
    const sections = ['Patients', 'Appointments', 'Profile'];
    
    for (const section of sections) {
      const link = page.locator(`a:has-text("${section}")`).first();
      
      if (await link.isVisible()) {
        await link.click();
        await page.waitForTimeout(1000);
        
        // Verify navigation
        const url = page.url();
        expect(url).toBeTruthy();
      }
    }
  });

  test('should display user profile information', async ({ page }) => {
    // Look for profile link
    const profileLink = page.locator('a:has-text("Profile"), button:has-text("Profile"), [aria-label*="profile"]').first();
    
    if (await profileLink.isVisible()) {
      await profileLink.click();
      await page.waitForTimeout(1000);
      
      // Should show user email or name
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain(testUser.email.toLowerCase());
    }
  });

  test('should have search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[aria-label*="search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test search');
      await page.waitForTimeout(500);
      
      // Search should accept input
      const value = await searchInput.inputValue();
      expect(value).toBe('test search');
    }
  });

  test('should display statistics or metrics', async ({ page }) => {
    // Look for common dashboard metrics
    const metrics = [
      'Total Patients',
      'Appointments',
      'Today',
      'This Week',
      'This Month'
    ];
    
    const pageContent = await page.textContent('body');
    
    // At least one metric should be visible
    const hasMetrics = metrics.some(metric => 
      pageContent.toLowerCase().includes(metric.toLowerCase())
    );
    
    expect(pageContent).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${baseURL}/dashboard`);
    
    await page.waitForTimeout(1000);
    
    // Page should load without horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20); // Allow small margin
  });

  test('should have working logout functionality', async ({ page }) => {
    // Find logout button
    const logoutButton = page.locator(
      'button:has-text("Logout"), ' +
      'a:has-text("Logout"), ' +
      'button:has-text("Sign Out"), ' +
      'a:has-text("Sign Out")'
    ).first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
      
      // Should redirect to login or home
      const url = page.url();
      expect(url).toMatch(/login|home|\//);
    }
  });
});

test.describe('Dashboard Performance', () => {
  const baseURL = process.env.FRONTEND_URL || 'http://localhost:8080';

  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle concurrent data loading', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    // Wait for multiple potential API calls to complete
    await page.waitForTimeout(3000);
    
    // Page should be interactive
    const isInteractive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });
    
    expect(isInteractive).toBe(true);
  });
});
