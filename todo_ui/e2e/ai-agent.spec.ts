import { test, expect } from '@playwright/test';

test.describe('AI Agent Integration', () => {
    test.skip('should send message to AI agent', async ({ page }) => {
        await page.goto('/dashboard');

        // Navigate to schedule/chat tab
        await page.getByRole('tab', { name: /schedule/i }).click();

        // Find chat input
        const chatInput = page.locator('input[placeholder*="brain"], textarea[placeholder*="brain"]').first();
        await chatInput.fill('Add a task to study calculus for 2 hours');

        // Send message
        await page.keyboard.press('Enter');
        // Or click send button if there is one
        // await page.getByRole('button', { name: /send/i }).click();

        // Wait for AI response
        await page.waitForSelector('[data-testid="ai-response"]', { timeout: 10000 });

        // Verify task was extracted
        await page.getByRole('tab', { name: /tasks/i }).click();
        await expect(page.getByText(/calculus/i)).toBeVisible();
    });

    test.skip('should handle calendar queries', async ({ page }) => {
        await page.goto('/dashboard');
        await page.getByRole('tab', { name: /schedule/i }).click();

        // Ask calendar question
        const chatInput = page.locator('input[placeholder*="brain"], textarea[placeholder*="brain"]').first();
        await chatInput.fill('What do I have scheduled tomorrow?');
        await page.keyboard.press('Enter');

        // Wait for response
        await page.waitForSelector('[data-testid="ai-response"]', { timeout: 10000 });

        // Should show calendar information
        await expect(page.locator('[data-testid="ai-response"]')).toContainText(/tomorrow|schedule/i);
    });

    test.skip('should update profile settings via AI', async ({ page }) => {
        await page.goto('/dashboard');
        await page.getByRole('tab', { name: /schedule/i }).click();

        // Send profile update message
        const chatInput = page.locator('input[placeholder*="brain"], textarea[placeholder*="brain"]').first();
        await chatInput.fill('I wake up at 6 AM and sleep at 10 PM');
        await page.keyboard.press('Enter');

        // Wait for processing
        await page.waitForTimeout(2000);

        // Check settings tab for updates
        await page.getByRole('tab', { name: /settings/i }).click();

        // Verify wake/sleep times are updated
        const wakeTime = page.locator('input[name="wake_time"]');
        const sleepTime = page.locator('input[name="sleep_time"]');

        await expect(wakeTime).toHaveValue(/06:00|6:00/);
        await expect(sleepTime).toHaveValue(/22:00|10:00 PM/);
    });
});
