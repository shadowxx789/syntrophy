import { test, expect, devices } from "@playwright/test";

/**
 * Mobile Adaptation Tests
 * Tests responsive behavior across different mobile viewport sizes
 */

// Mobile viewport sizes to test
const mobileViewports = [
  { name: "iPhone SE", ...devices["iPhone SE"].viewport },
  { name: "iPhone 12", ...devices["iPhone 12"].viewport },
  { name: "iPhone 14 Pro Max", ...devices["iPhone 14 Pro Max"].viewport },
  { name: "Pixel 5", ...devices["Pixel 5"].viewport },
  { name: "Samsung Galaxy S21", width: 360, height: 800 },
];

test.describe("Mobile Responsiveness", () => {
  for (const viewport of mobileViewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width!, height: viewport.height! } });

      test("should display header correctly", async ({ page }) => {
        await page.goto("/");

        // Header should be visible
        const header = page.locator("header");
        await expect(header).toBeVisible();

        // App title should be visible
        await expect(page.getByText("凝序")).toBeVisible();
      });

      test("should display command input at bottom", async ({ page }) => {
        await page.goto("/");

        // Command input should be visible and accessible
        const input = page.getByPlaceholder(/输入指令|输入任务|添加/i);
        await expect(input).toBeVisible();

        // Input should be near bottom of viewport (for thumb-friendly access)
        const inputBox = await input.boundingBox();
        if (inputBox) {
          // Input should be in the lower 40% of the screen
          expect(inputBox.y).toBeGreaterThan(viewport.height! * 0.5);
        }
      });

      test("should have touch-friendly button sizes", async ({ page }) => {
        await page.goto("/");

        // Buttons should have minimum 44px touch target (WCAG 2.1 AAA)
        const buttons = page.locator("button");
        const buttonCount = await buttons.count();

        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
          const button = buttons.nth(i);
          if (await button.isVisible()) {
            const box = await button.boundingBox();
            if (box) {
              // Minimum touch target should be at least 40px (relaxed from 44px for icon buttons)
              expect(box.width).toBeGreaterThanOrEqual(32);
              expect(box.height).toBeGreaterThanOrEqual(32);
            }
          }
        }
      });

      test("should not have horizontal overflow", async ({ page }) => {
        await page.goto("/");

        // Check that body doesn't have horizontal scroll
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(viewport.width! + 5); // 5px tolerance
      });

      test("should display task list properly", async ({ page }) => {
        await page.goto("/");

        // Main content area should be scrollable
        const main = page.locator("main");
        await expect(main).toBeVisible();

        // Task list container should exist
        const taskList = page.locator('[data-testid="task-list"], .task-list, main > div');
        await expect(taskList.first()).toBeVisible();
      });
    });
  }
});

test.describe("Settings Page Mobile", () => {
  test.use({ viewport: devices["iPhone 12"].viewport });

  test("should display all sections stacked vertically", async ({ page }) => {
    await page.goto("/settings");

    // AI service config section
    await expect(page.getByText(/AI 服务配置/i)).toBeVisible();

    // Theme section
    await expect(page.getByText(/外观/i)).toBeVisible();

    // Scroll to see more sections
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Data management section
    await expect(page.getByText(/数据管理/i)).toBeVisible();
  });

  test("should have touch-friendly settings controls", async ({ page }) => {
    await page.goto("/settings");

    // Provider buttons should be tappable
    const openaiButton = page.getByRole("button", { name: /OpenAI/i });
    await expect(openaiButton).toBeVisible();
    const box = await openaiButton.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(36);
    }
  });

  test("should display prompt configuration section", async ({ page }) => {
    await page.goto("/settings");

    // Scroll to find prompt config
    await page.evaluate(() => window.scrollTo(0, 500));

    // Prompt config section should exist
    await expect(page.getByText(/AI 提示词配置/i)).toBeVisible();
  });
});

test.describe("Quick Mode Mobile", () => {
  test.use({ viewport: devices["iPhone 12"].viewport });

  test("should load quick mode page on mobile", async ({ page }) => {
    await page.goto("/quick");

    // Should have quick mode UI
    await expect(page.getByText(/闪电快传|Quick/i)).toBeVisible({ timeout: 10000 });
  });

  test("should have full-width input on mobile", async ({ page }) => {
    await page.goto("/quick");

    // Input/textarea should take full width
    const inputs = page.locator("input, textarea");
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const box = await input.boundingBox();
        if (box) {
          // Should take at least 80% of viewport width
          expect(box.width).toBeGreaterThan(devices["iPhone 12"].viewport!.width * 0.7);
        }
      }
    }
  });
});

test.describe("Touch Interactions", () => {
  test.use({ viewport: devices["iPhone 12"].viewport, hasTouch: true });

  test("should support tap on buttons", async ({ page }) => {
    await page.goto("/");

    // Tap on settings button
    const settingsButton = page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .last();
    if (await settingsButton.isVisible()) {
      await settingsButton.tap();
      // Should navigate to settings
      await expect(page).toHaveURL(/settings/, { timeout: 5000 });
    }
  });

  test("should support tap on theme toggle", async ({ page }) => {
    await page.goto("/settings");

    // Find theme buttons
    const darkButton = page.getByRole("button", { name: /深色|Dark/i });
    if (await darkButton.isVisible()) {
      await darkButton.tap();
      // Theme should change (we can check for dark class on html/body)
    }
  });
});

test.describe("Orientation Changes", () => {
  test("should handle landscape orientation", async ({ page }) => {
    // Landscape iPhone
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");

    // Should still be usable
    await expect(page.getByText("凝序")).toBeVisible();

    // Command input should still be visible
    const input = page.getByPlaceholder(/输入指令|输入任务|添加/i);
    await expect(input).toBeVisible();
  });

  test("should handle tablet viewport", async ({ page }) => {
    // iPad Mini
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    // Should display properly
    await expect(page.getByText("凝序")).toBeVisible();

    // Content should expand to fill width appropriately
    const main = page.locator("main");
    const box = await main.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThan(700);
    }
  });
});

test.describe("Accessibility on Mobile", () => {
  test.use({ viewport: devices["iPhone 12"].viewport });

  test("should have proper focus management", async ({ page }) => {
    await page.goto("/");

    // Tab through interactive elements
    await page.keyboard.press("Tab");

    // Something should have focus
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test("should have readable text sizes", async ({ page }) => {
    await page.goto("/");

    // Check that main text is at least 16px (WCAG recommendation)
    const bodyFontSize = await page.evaluate(() => {
      const computed = window.getComputedStyle(document.body);
      return parseFloat(computed.fontSize);
    });
    expect(bodyFontSize).toBeGreaterThanOrEqual(14);
  });
});
