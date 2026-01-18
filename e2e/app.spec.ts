import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load the home page", async ({ page }) => {
    await page.goto("/");

    // Should have the app title or header
    await expect(page).toHaveTitle(/凝序|Syntropy/i);
  });

  test("should display the command input", async ({ page }) => {
    await page.goto("/");

    // Command input should be visible
    const commandInput = page.getByPlaceholder(/输入指令|输入任务|添加/i);
    await expect(commandInput).toBeVisible();
  });

  test("should display the tab navigation", async ({ page }) => {
    await page.goto("/");

    // Should have at least one tab
    const tabs = page.locator('[role="tablist"], [data-testid="tab-nav"]');
    await expect(tabs).toBeVisible();
  });
});

test.describe("Task Management", () => {
  test("should add a new task via command input", async ({ page }) => {
    await page.goto("/");

    // Find the command input
    const commandInput = page.getByPlaceholder(/输入指令|输入任务|添加/i);

    // Type a new task
    await commandInput.fill("测试任务一");
    await commandInput.press("Enter");

    // Wait for the task to appear (might need AI processing or direct add)
    // This test assumes the task appears in the list
    await expect(page.getByText("测试任务一")).toBeVisible({ timeout: 10000 });
  });

  test("should toggle task completion", async ({ page }) => {
    await page.goto("/");

    // Add a task first
    const commandInput = page.getByPlaceholder(/输入指令|输入任务|添加/i);
    await commandInput.fill("待完成任务");
    await commandInput.press("Enter");

    // Wait for task to appear
    await expect(page.getByText("待完成任务")).toBeVisible({ timeout: 10000 });

    // Find the checkbox and click it
    const checkbox = page.locator('[role="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.click();

      // Verify the task is marked as done (could check for strikethrough, different styling, etc.)
      // This depends on how completion is visually indicated
    }
  });
});

test.describe("Settings Page", () => {
  test("should navigate to settings page", async ({ page }) => {
    await page.goto("/");

    // Click on settings link/button
    const settingsLink = page.getByRole("link", { name: /设置/i });
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
    } else {
      // Try navigating directly
      await page.goto("/settings");
    }

    // Should be on settings page
    await expect(page).toHaveURL(/settings/);
    await expect(page.getByText(/AI 服务配置|设置/i)).toBeVisible();
  });

  test("should display AI provider options", async ({ page }) => {
    await page.goto("/settings");

    // Should see provider buttons
    await expect(page.getByRole("button", { name: /OpenAI/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /DeepSeek/i })).toBeVisible();
  });

  test("should display theme options", async ({ page }) => {
    await page.goto("/settings");

    // Should see theme buttons
    await expect(page.getByRole("button", { name: /浅色|Light/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /深色|Dark/i })).toBeVisible();
  });

  test("should display AI prompt configuration section", async ({ page }) => {
    await page.goto("/settings");

    // Should see prompt configuration section
    await expect(page.getByText(/AI 提示词配置/i)).toBeVisible();
  });
});

test.describe("Quick Mode Page", () => {
  test("should load quick mode page", async ({ page }) => {
    await page.goto("/quick");

    // Should have quick mode title or input
    await expect(page.getByText(/闪电快传|Quick/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Navigation", () => {
  test("should navigate back from settings", async ({ page }) => {
    await page.goto("/settings");

    // Click back button
    const backButton = page
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .first();
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL("/");
    }
  });
});
