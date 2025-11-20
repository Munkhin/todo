import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
    test.skip('should show onboarding for first-time users', async ({ page }) => {
        // This test requires a fresh user account or mocked state
        await page.goto('/dashboard');

        // Check if onboarding overlay appears
        const onboarding = page.locator('[data-testid="onboarding-overlay"]');
        await expect(onboarding).toBeVisible();
    });

    test.skip('should allow skipping onboarding', async ({ page }) => {
        await page.goto('/dashboard');

        // Wait for onboarding
        await page.waitForSelector('[data-testid="onboarding-overlay"]');

        // Click skip button
        await page.getByRole('button', { name: /skip/i }).click();

        // Onboarding should close
        const onboarding = page.locator('[data-testid="onboarding-overlay"]');
        await expect(onboarding).not.toBeVisible();
    });

    test.skip('should complete onboarding flow', async ({ page }) => {
        await page.goto('/dashboard');

        // Page 1: Subjects
        await page.fill('input[name="subjects"]', 'Math, Science, History');
        await page.getByRole('button', { name: /next/i }).click();

        // Page 2: Test dates
        await page.fill('input[name="test_date_1"]', '2025-12-15');
        await page.getByRole('button', { name: /next/i }).click();

        // Page 3: Preferences (wake/sleep times)
        await page.fill('input[name="wake_time"]', '7:00');
        await page.fill('input[name="sleep_time"]', '23:00');
        await page.getByRole('button', { name: /next/i }).click();

        // Page 4: Energy graph (if applicable)
        // Interact with energy graph component
        await page.getByRole('button', { name: /finish|complete/i }).click();

        // Should close onboarding and show dashboard
        const onboarding = page.locator('[data-testid="onboarding-overlay"]');
        await expect(onboarding).not.toBeVisible();

        // Tasks should be generated
        await page.getByRole('tab', { name: /tasks/i }).click();
        // Verify initial tasks were created
    });

    test.skip('should validate onboarding inputs', async ({ page }) => {
        await page.goto('/dashboard');

        // Try to proceed without filling required fields
        await page.getByRole('button', { name: /next/i }).click();

        // Should show validation error
        await expect(page.getByText(/required|fill/i)).toBeVisible();
    });
});
