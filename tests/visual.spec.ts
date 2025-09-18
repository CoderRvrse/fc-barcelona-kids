import { test, expect } from "@playwright/test";

test.describe("Visual Regression Tests", () => {
  test("hero section visual", async ({ page }) => {
    await page.goto("https://coderrvrse.github.io/fc-barcelona-kids/");

    // Wait for page to load and fonts to render
    await page.waitForLoadState("networkidle");

    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Wait for hero title SVG to be present
    await expect(page.locator("#heroTitleSvg")).toBeVisible();

    // Take screenshot of hero section
    await expect(page.locator("#hero")).toHaveScreenshot("hero-desktop.png");
  });

  test("hero section mobile visual", async ({ page }) => {
    await page.goto("https://coderrvrse.github.io/fc-barcelona-kids/");

    // Wait for page to load and fonts to render
    await page.waitForLoadState("networkidle");

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for hero title SVG to be present
    await expect(page.locator("#heroTitleSvg")).toBeVisible();

    // Take screenshot of hero section on mobile
    await expect(page.locator("#hero")).toHaveScreenshot("hero-mobile.png");
  });

  test("rolling ball animation elements", async ({ page }) => {
    await page.goto("https://coderrvrse.github.io/fc-barcelona-kids/");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Verify key animation elements are present
    await expect(page.locator("#heroTitleSvg")).toBeVisible();
    await expect(page.locator("#heroBall")).toBeVisible();
    await expect(page.locator("#revealMask")).toBeVisible();
    await expect(page.locator(".hero-replay")).toBeVisible();

    // Take screenshot for regression detection
    await expect(page.locator(".hero-title")).toHaveScreenshot("rolling-ball-elements.png");
  });
});