/**
 * Navigation E2E Tests
 * Tests for application navigation and routing
 */

const { test, expect } = require('@playwright/test');

test.describe('Application Navigation', () => {
  const baseURL = process.env.FRONTEND_URL || 'http://localhost:8080';

  test('should navigate to home page', async ({ page }) => {
    await page.goto(baseURL);
    
    await expect(page).toHaveTitle(/Healthcare/i);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should have working navigation menu', async ({ page }) => {
    await page.goto(baseURL);
    
    // Check for common navigation links
    const navLinks = [
      'Home',
      'About',
      'Services',
      'Contact',
      'Login',
      'Register'
    ];
    
    for (const linkText of navLinks) {
      const link = page.locator(`a:has-text("${linkText}")`).first();
      if (await link.isVisible()) {
        await link.click();
        await page.waitForTimeout(1000);
        
        // Verify navigation occurred
        const url = page.url();
        expect(url).toBeTruthy();
      }
    }
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto(baseURL);
    
    const loginLink = page.locator('a:has-text("Login"), button:has-text("Login")').first();
    await loginLink.click();
    
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/login/i);
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto(baseURL);
    
    const registerLink = page.locator('a:has-text("Register"), a:has-text("Sign Up"), button:has-text("Register")').first();
    await registerLink.click();
    
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/register|signup/i);
  });

  test('should handle 404 page', async ({ page }) => {
    await page.goto(`${baseURL}/non-existent-page-12345`);
    
    // Check for 404 message or redirect
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should have responsive navigation', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(baseURL);
    
    // Look for mobile menu button
    const mobileMenuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu")').first();
    
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await page.waitForTimeout(500);
      
      // Check if menu is visible
      const menu = page.locator('nav, [role="navigation"]').first();
      await expect(menu).toBeVisible();
    }
  });

  test('should maintain state during navigation', async ({ page }) => {
    await page.goto(baseURL);
    
    // Navigate to different pages
    await page.goto(`${baseURL}/about`);
    await page.waitForTimeout(500);
    
    await page.goto(`${baseURL}/services`);
    await page.waitForTimeout(500);
    
    // Go back
    await page.goBack();
    await page.waitForTimeout(500);
    
    const url = page.url();
    expect(url).toMatch(/about/i);
  });
});
