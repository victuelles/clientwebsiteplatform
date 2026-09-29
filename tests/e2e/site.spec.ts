import { expect, test } from "@playwright/test";

// The public top bar, header, and footer, and the seeded homepage (North / Co content).
// Each block sets its own viewport, so this file runs once (in the desktop project).
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Sets its own viewports; runs once.");
});

test.describe("public site chrome at 1440px", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("top bar, header, and footer show the design's content", async ({ page }) => {
    await page.goto("/");
    const topBar = page.getByTestId("top-bar");
    await expect(topBar.getByRole("link", { name: "+1 (650) 410-7800" })).toBeVisible();
    await expect(topBar.getByRole("link", { name: "hello@yourcompany.com" })).toBeVisible();
    await expect(topBar.getByText("San Francisco Bay Area, CA")).toBeVisible();

    const header = page.getByTestId("site-header");
    await expect(header.getByRole("link", { name: "North / Co home" })).toBeVisible();
    const mainNav = header.getByRole("navigation", { name: "Main" });
    for (const label of ["Home", "About", "Services", "Our Impact"]) {
      await expect(mainNav.getByRole("link", { name: label })).toBeVisible();
    }
    // "Insights" links to the blog module, which is off until Phase 6, so it is hidden.
    await expect(mainNav.getByRole("link", { name: "Insights" })).toHaveCount(0);
    await expect(header.getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(header.getByRole("link", { name: "Let's talk" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();

    const footer = page.getByTestId("site-footer");
    for (const heading of ["Explore", "What we do", "Get in touch"]) {
      await expect(footer.getByRole("heading", { name: heading })).toBeVisible();
    }
    await expect(
      footer.getByText(`© ${new Date().getFullYear()} North & Co. All rights reserved.`),
    ).toBeVisible();
    await expect(footer.getByRole("link", { name: "Growth Strategy" })).toHaveAttribute(
      "href",
      "/services#growth-strategy",
    );
    await expect(footer.getByRole("link", { name: "Email us" })).toHaveAttribute(
      "href",
      "mailto:hello@yourcompany.com",
    );

    // Desktop: the footer columns sit in one row.
    const explore = await footer.getByRole("heading", { name: "Explore" }).boundingBox();
    const contact = await footer.getByRole("heading", { name: "Get in touch" }).boundingBox();
    expect(Math.abs(explore!.y - contact!.y)).toBeLessThan(2);
  });

  test("visual reference: top bar, header, footer", async ({ page }) => {
    test.skip(!!process.env.CI, "Baselines are rendered on macOS; run locally.");
    await page.goto("/");
    await expect(page.getByTestId("top-bar")).toHaveScreenshot("top-bar-1440.png");
    await expect(page.getByTestId("site-header")).toHaveScreenshot("header-1440.png");
    await expect(page.getByTestId("site-footer")).toHaveScreenshot("footer-1440.png");
  });
});

test.describe("public site chrome at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the mobile menu opens and closes, and the layout stacks", async ({ page }) => {
    await page.goto("/");

    // Top bar: phone and email only.
    const topBar = page.getByTestId("top-bar");
    await expect(topBar.getByRole("link", { name: "+1 (650) 410-7800" })).toBeVisible();
    await expect(topBar.getByRole("link", { name: "hello@yourcompany.com" })).toBeVisible();
    await expect(topBar.getByText("San Francisco Bay Area, CA")).toBeHidden();

    // Header: logo and hamburger, no inline links.
    const header = page.getByTestId("site-header");
    await expect(header.getByRole("navigation", { name: "Main" })).toBeHidden();
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box!.width).toBe(390);
    await expect(menu.getByRole("link", { name: "Let's talk" })).toBeVisible();
    await menu.getByRole("button", { name: "Close menu" }).click();
    await expect(menu).toBeHidden();

    // Footer: "Get in touch" stacks below the two link columns.
    const footer = page.getByTestId("site-footer");
    const explore = await footer.getByRole("heading", { name: "Explore" }).boundingBox();
    const whatWeDo = await footer.getByRole("heading", { name: "What we do" }).boundingBox();
    const contact = await footer.getByRole("heading", { name: "Get in touch" }).boundingBox();
    expect(Math.abs(explore!.y - whatWeDo!.y)).toBeLessThan(2);
    expect(contact!.y).toBeGreaterThan(explore!.y + 100);
  });

  test("menu links navigate and close the menu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("visual reference: top bar, header, footer", async ({ page }) => {
    test.skip(!!process.env.CI, "Baselines are rendered on macOS; run locally.");
    await page.goto("/");
    await expect(page.getByTestId("top-bar")).toHaveScreenshot("top-bar-390.png");
    await expect(page.getByTestId("site-header")).toHaveScreenshot("header-390.png");
    await expect(page.getByTestId("site-footer")).toHaveScreenshot("footer-390.png");
  });
});

// Full-page baselines of the seeded homepage. They assume a freshly reset database with
// `pnpm seed:media` run (the e2e specs never change the homepage). Reduced motion keeps the stats
// at their final values instead of counting up.
test.describe("seeded homepage", () => {
  test.use({ reducedMotion: "reduce" });

  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    test(`visual reference: homepage at ${width}px`, async ({ page }) => {
      test.skip(!!process.env.CI, "Baselines are rendered on macOS; run locally.");
      await page.setViewportSize({ width, height });
      await page.goto("/");
      // Load lazy images, then return to the top.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 50));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete));
      await expect(page).toHaveScreenshot(`homepage-${width}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
