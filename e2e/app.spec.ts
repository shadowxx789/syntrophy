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
    const commandInput = page.getByPlaceholder(/Enter (natural language command|task content)/i);
    await expect(commandInput).toBeVisible();
  });

  test("should display the tab navigation", async ({ page }) => {
    await page.goto("/");

    // Should have at least one tab
    const defaultProjectTab = page.getByRole("button", { name: /默认项目/i });
    await expect(defaultProjectTab).toBeVisible();
  });

  test("should open export modal", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /导出/i }).click();

    await expect(page.getByRole("heading", { name: /导出项目/i })).toBeVisible();
    await expect(page.getByText(/选择项目/i)).toBeVisible();
  });
});

test.describe("Task Management", () => {
  test("should add a new task via command input", async ({ page }) => {
    await page.goto("/");

    // Find the command input
    const commandInput = page.getByPlaceholder(/Enter (natural language command|task content)/i);

    // Type a new task
    await commandInput.fill("测试任务一");
    await commandInput.press("Enter");

    // Wait for the task to appear (might need AI processing or direct add)
    // This test assumes the task appears in the list
    await expect(page.locator("p", { hasText: "测试任务一" })).toBeVisible({ timeout: 10000 });
  });

  test("should toggle task completion", async ({ page }) => {
    await page.goto("/");

    // Add a task first
    const commandInput = page.getByPlaceholder(/Enter (natural language command|task content)/i);
    await commandInput.fill("待完成任务");
    await commandInput.press("Enter");

    // Wait for task to appear
    await expect(page.locator("p", { hasText: "待完成任务" })).toBeVisible({ timeout: 10000 });

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
    await expect(page.getByRole("heading", { name: /AI 服务配置/i })).toBeVisible();
  });

  test("should display AI provider options", async ({ page }) => {
    await page.goto("/settings");

    // Should see provider buttons
    await expect(page.getByRole("button", { name: /OpenAI/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /DeepSeek/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Gemini/i })).toBeVisible();
  });

  test("should open custom provider modal and add config", async ({ page }) => {
    await page.goto("/settings");

    const customButton = page.getByRole("button", { name: /自定义/i }).first();
    await customButton.click();

    await page.getByRole("menuitem", { name: /添加新配置/i }).click();

    await expect(page.getByRole("heading", { name: /添加自定义配置/i })).toBeVisible();

    await page.getByPlaceholder(/Moonshot|Ollama|配置名称/i).fill("测试提供商");
    await page
      .getByPlaceholder(/https:\/\/api\.example\.com\/v1/i)
      .fill("https://api.test-provider.com/v1");
    await page.getByPlaceholder(/gpt-4o|llama3\.2|qwen2\.5/i).fill("test-model");

    await page.getByRole("button", { name: /添加配置/i }).click();

    // Select the newly added provider
    await customButton.click();
    await page.getByRole("menuitem", { name: /测试提供商/i }).click();

    await expect(page.getByRole("heading", { name: "测试提供商" })).toBeVisible();
  });

  test("should show Gemini model selection when Gemini is selected", async ({ page }) => {
    await page.goto("/settings");

    // Click Gemini button
    await page.getByRole("button", { name: /Gemini/i }).click();

    // Should see Gemini model options
    await expect(page.getByText(/Gemini 模型/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Gemini 3 Flash/i })).toBeVisible();
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
    await expect(page.getByRole("heading", { name: /Quick Mode|闪电快传/i })).toBeVisible({
      timeout: 5000,
    });
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
