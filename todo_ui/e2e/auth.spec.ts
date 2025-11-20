import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should display landing page', async ({ page }) => {
        await page.goto('/');

        // Check for main elements
        await expect(page).toHaveTitle(/todo/i);

        // Should have sign in/up buttons
        const signInButton = page.getByRole('button', { name: /sign in/i });
        await expect(signInButton).toBeVisible();
    });

    test('should navigate to auth page', async ({ page }) => {
        await page.goto('/');

        // Click sign in
        await page.getByRole('button', { name: /sign in/i }).click();

        // Should navigate to auth page
        await expect(page).toHaveURL(/auth/);
    });
});
