import { test, expect } from '@playwright/test';

test('Verify hckr-tools.github.io site pages', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  // 1. Visit homepage
  await page.goto('http://localhost:3000/');
  await expect(page.locator('h1')).toContainText('Developer Utilities Right in Your Browser Side Panel');
  
  // Verify DevDocs is NOT in navbar
  await expect(page.locator('.navbar__items a', { hasText: 'DevDocs' })).toHaveCount(0);
  // Verify Features & Docs IS in navbar
  await expect(page.locator('.navbar__items a', { hasText: 'Features & Docs' })).toBeVisible();

  // Screenshot homepage full
  await page.screenshot({ path: '/Users/ashishpatel/.gemini/antigravity/brain/ba440726-4c79-48a1-b965-95bba5e0b2f9/homepage-full.png', fullPage: true });

  // 2. Visit Docs
  await page.locator('.navbar__items a', { hasText: 'Features & Docs' }).click();
  await expect(page.locator('h1')).toContainText('Welcome to hckr');
  await page.screenshot({ path: '/Users/ashishpatel/.gemini/antigravity/brain/ba440726-4c79-48a1-b965-95bba5e0b2f9/docs-welcome.png' });

  // 3. Visit Workspace Tool doc
  await page.goto('http://localhost:3000/docs/tools/workspace/');
  await expect(page.locator('h1')).toContainText('Developer Workspace & Kanban');
  await expect(page.locator('img[alt="Workspace Screenshot"]')).toBeVisible();
  await page.screenshot({ path: '/Users/ashishpatel/.gemini/antigravity/brain/ba440726-4c79-48a1-b965-95bba5e0b2f9/doc-workspace.png' });

  // 4. Visit JSON Formatter doc
  await page.goto('http://localhost:3000/docs/tools/json-formatter/');
  await expect(page.locator('h1')).toContainText('JSON Formatter & Validator');
  await expect(page.locator('img[alt="JSON Formatter Screenshot"]')).toBeVisible();
  await page.screenshot({ path: '/Users/ashishpatel/.gemini/antigravity/brain/ba440726-4c79-48a1-b965-95bba5e0b2f9/doc-json.png' });

  console.log('All portal pages verified and screenshotted successfully!');
});
