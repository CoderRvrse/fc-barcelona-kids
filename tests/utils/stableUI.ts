import { Page } from '@playwright/test';

/**
 * Wait for the hero entrance animation to finish before locking the frame.
 */
export async function settleHero(page: Page) {
  await page.waitForTimeout(900);
}

export async function stabilizeUI(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      html { scroll-behavior: auto !important; }
    `
  });
}
