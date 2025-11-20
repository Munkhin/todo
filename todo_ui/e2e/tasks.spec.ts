import { test, expect } from '@playwright/test';

// Note: These tests require authentication
// You may need to set up auth state or mock authentication

test.describe('Task Management', () => {
    test.skip('should display tasks tab', async ({ page }) => {
        // Skip if not authenticated - update when auth is set up
        await page.goto('/dashboard');

        // Navigate to tasks tab
        await page.getByRole('tab', { name: /tasks/i }).click();

        // Check if tasks view is visible
        const tasksView = page.locator('[data-testid="tasks-view"]');
        await expect(tasksView).toBeVisible();
    });

    test.skip('should create a new task', async ({ page }) => {
        await page.goto('/dashboard');
        await page.getByRole('tab', { name: /tasks/i }).click();

        // Click add task button
        await page.getByRole('button', { name: /add task/i }).click();

        // Fill in task details
        await page.fill('input[name="title"]', 'Test Task');
        await page.fill('textarea[name="description"]', 'This is a test task');

        // Submit
        await page.getByRole('button', { name: /create task/i }).click();

        // Verify task appears
        await expect(page.getByText('Test Task')).toBeVisible();
    });

    test.skip('should edit a task', async ({ page }) => {
        await page.goto('/dashboard');
        await page.getByRole('tab', { name: /tasks/i }).click();

        // Click on a task to edit (assumes at least one task exists)
        await page.getByText('Test Task').click();

        // Edit title
        await page.fill('input[name="title"]', 'Updated Test Task');

        // Save changes
        await page.getByRole('button', { name: /save changes/i }).click();

        // Verify update
        await expect(page.getByText('Updated Test Task')).toBeVisible();
    });

    test.skip('should delete a task', async ({ page }) => {
        await page.goto('/dashboard');
        await page.getByRole('tab', { name: /tasks/i }).click();

        // Click on a task
        await page.getByText('Updated Test Task').click();

        // Click delete button
        await page.getByRole('button', { name: /delete/i }).click();

        // Confirm deletion (if there's a confirmation dialog)
        // await page.getByRole('button', { name: /confirm/i }).click();

        // Verify task is removed
        await expect(page.getByText('Updated Test Task')).not.toBeVisible();
    });

    test.skip('should schedule a task', async ({ page }) => {
        await page.goto('/dashboard');
        await page.getByRole('tab', { name: /tasks/i }).click();

        // Click on a task
        await page.getByText('Test Task').click();

        // Click schedule button
        await page.getByRole('button', { name: /schedule for me/i }).click();

        // Wait for scheduling to complete
        await page.waitForSelector('[data-testid="schedule-complete"]', { timeout: 10000 });

        // Verify events were created
        await page.getByRole('tab', { name: /schedule/i }).click();
        // Check if events appear in calendar
    });
});
