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

      /* Force final state for hero title animation */
      #titleSolid { opacity: 1 !important; }
      #maskedGroup { display: none !important; }
      .hero-ball { animation: none !important; }

      /* Override reduced motion media query */
      @media (prefers-reduced-motion: reduce) {
        .hero-title-fallback { display: none !important; }
        #heroTitleSvg { display: block !important; }
      }
    `
  });
}
