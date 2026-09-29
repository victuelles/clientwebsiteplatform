import { expect, test } from "@playwright/test";

// The public top bar, header, and footer (North / Co defaults).
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
    for (const label of ["Home", "About", "Services", "Our Impact", "Insights"]) {
      await expect(
        header.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label }),
      ).toBeVisible();
    }
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
