import { test, expect } from '@playwright/test';
import { stabilizeUI } from './utils/stableUI';

test('hero renders consistently (desktop)', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await stabilizeUI(page);

  // Ensure hero is visible:
  const hero = page.locator('#hero, .hero, [data-hero]');
  await expect(hero).toBeVisible();

  // Fixed viewport already in config; scroll to a known position:
  await page.evaluate(() => window.scrollTo(0, 0));

  // Snapshot with deterministic conditions:
  expect(await hero.screenshot()).toMatchSnapshot('hero-desktop.png', {
    maxDiffPixelRatio: 0.002
  });
});

test('hero renders consistently (mobile)', async ({ page }) => {
  // Override viewport for mobile test
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await stabilizeUI(page);

  // Ensure hero is visible:
  const hero = page.locator('#hero, .hero, [data-hero]');
  await expect(hero).toBeVisible();

  // Fixed position for mobile:
  await page.evaluate(() => window.scrollTo(0, 0));

  // Snapshot with deterministic conditions:
  expect(await hero.screenshot()).toMatchSnapshot('hero-mobile.png', {
    maxDiffPixelRatio: 0.002
  });
});