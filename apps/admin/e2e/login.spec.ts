import { test, expect } from "@playwright/test";

test.describe("Admin Login Flow", () => {
  test("should show login page", async ({ page }) => {
    // Go to login page
    await page.goto("/login");

    // Check if the login form is present
    await expect(page.locator("text=Sign in to Publisher Admin")).toBeVisible();
    await expect(page.locator("input[name='email']")).toBeVisible();
    await expect(page.locator("input[name='password']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  // Note: We skip the actual login flow here because the test setup would need
  // the API to be running on port 3000 and seeded with the test users.
  // This validates the UI is reachable and contains the necessary elements.
});
