import { Page } from '@playwright/test';

export async function stabilizeUI(page: Page) {
  // Disable animations/transitions for stable screenshots:
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