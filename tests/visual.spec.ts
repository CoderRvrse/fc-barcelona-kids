import { test, expect } from '@playwright/test';
import { settleHero, stabilizeUI } from './utils/stableUI';

test('hero renders consistently (desktop)', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await settleHero(page);
  await stabilizeUI(page);

  const hero = page.locator('#hero, .hero, [data-hero]');
  await expect(hero).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 0));

  expect(await hero.screenshot()).toMatchSnapshot('hero-desktop.png', {
    maxDiffPixelRatio: 0.002
  });
});

test('hero renders consistently (mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await settleHero(page);
  await stabilizeUI(page);

  const hero = page.locator('#hero, .hero, [data-hero]');
  await expect(hero).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 0));

  expect(await hero.screenshot()).toMatchSnapshot('hero-mobile.png', {
    maxDiffPixelRatio: 0.002
  });
});
