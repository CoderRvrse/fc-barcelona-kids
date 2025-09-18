import { test, expect } from '@playwright/test';

test('hero visual desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('https://coderrvrse.github.io/fc-barcelona-kids/');
  await page.waitForSelector('#heroTitleSvg', { timeout: 15000 });
  await expect(page.locator('#heroTitleSvg')).toHaveScreenshot('hero-desktop.png', {
    maxDiffPixelRatio: 0.002
  });
});

test('hero visual mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('https://coderrvrse.github.io/fc-barcelona-kids/');
  await page.waitForSelector('#heroTitleSvg', { timeout: 15000 });
  await expect(page.locator('#heroTitleSvg')).toHaveScreenshot('hero-mobile.png', {
    maxDiffPixelRatio: 0.002
  });
});