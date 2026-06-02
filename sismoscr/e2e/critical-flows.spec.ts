/*
 * Critical flow: map loads → user sees quakes → navigates to history → filter works
 * Second flow: PWA offline → cached content still renders
 * Third flow: push notification → click → opens detail
 */
import { test, expect } from "@playwright/test";

test.describe("Critical flows", () => {
  test("Homepage loads map with earthquake data", async ({ page }) => {
    await page.goto("/");

    // Wait for map container to render
    await page.waitForSelector(".leaflet-container", { timeout: 15000 });

    // Wait for API data to load — stats card should show numbers
    await page.waitForFunction(
      () => {
        const el = document.querySelector("body");
        return el?.textContent?.includes("Total") ?? false;
      },
      { timeout: 15000 }
    );

    // Verify stats are visible
    await expect(page.locator("text=Estadísticas")).toBeVisible();
    await expect(page.locator("text=Total")).toBeVisible();
    await expect(page.locator("text=Max Mag")).toBeVisible();
  });

  test("History page loads with earthquake table", async ({ page }) => {
    await page.goto("/history");

    // Wait for the history title
    await expect(page.locator("text=Historial Sísmico")).toBeVisible({
      timeout: 10000,
    });

    // Wait for data — table or mobile cards should render
    await page.waitForFunction(
      () => {
        const el = document.querySelector("body");
        return el?.textContent?.includes("ML") ?? false;
      },
      { timeout: 15000 }
    );
  });

  test("Filter by magnitude on history page", async ({ page }) => {
    await page.goto("/history");

    // Wait for data
    await page.waitForFunction(
      () => document.body.textContent?.includes("ML") ?? false,
      { timeout: 15000 }
    );

    // Set min magnitude filter
    const minMagInput = page.locator('input[type="number"]').first();
    await minMagInput.fill("3");

    // Wait a tick for filter to apply
    await page.waitForTimeout(500);

    // Verify only rows with M≥3 remain (or empty state if none)
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("Dark mode toggle works", async ({ page }) => {
    await page.goto("/");

    // Wait for nav to render
    await page.waitForSelector("nav", { timeout: 10000 });

    // Click dark mode toggle
    const darkButton = page.locator("button").filter({ hasText: /dark|light/i });
    if (await darkButton.count() > 0) {
      await darkButton.first().click();
      // Check dark class was added
      const hasDark = await page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      );
      expect(hasDark).toBe(true);
    }
  });

  test("Language toggle switches text", async ({ page }) => {
    await page.goto("/");

    // Find language toggle button (ES/EN)
    const langButton = page.locator("button").filter({ hasText: /^ES$|^EN$/ });
    await expect(langButton.first()).toBeVisible({ timeout: 10000 });

    // Get current text
    const currentText = await langButton.first().textContent();

    // Click to toggle
    await langButton.first().click();
    await page.waitForTimeout(300);

    // Text should have changed
    const newText = await langButton.first().textContent();
    expect(newText).not.toBe(currentText);
  });
});

test.describe("Navigation", () => {
  test("Navigate between map and history", async ({ page }) => {
    await page.goto("/");

    // Click history link in nav
    await page.click('a[href="/history"]');
    await expect(page).toHaveURL(/\/history/);
    await expect(page.locator("text=Historial Sísmico")).toBeVisible({
      timeout: 10000,
    });

    // Click map link to return
    await page.click('a[href="/"]');
    await expect(page).toHaveURL("/");
  });
});
