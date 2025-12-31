import { test, expect } from '@playwright/test';

test('Database Cleanup', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes timeout

    // Log browser console messages to the terminal
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

    console.log('Navigating to cleanup tool...');
    try {
        // Use relative path so it uses the baseURL (localhost:5173) configured in playwright.config.js
        await page.goto('/sh-clear-database-xyz');
    } catch (e) {
        console.error('Failed to load page. Is the dev server running?');
        throw e;
    }

    // Wait for the success indication
    await expect(page.locator('text=Completed Successfully')).toBeVisible({ timeout: 120000 });

    console.log('Database wiped successfully.');
});
