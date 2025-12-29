import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
    // Use the seeded test user
    await page.goto('/auth');

    // Wait for the login form to be visible
    await expect(page.getByPlaceholder('staff.name@unijos.edu.ng')).toBeVisible();

    await page.getByPlaceholder('staff.name@unijos.edu.ng').fill('test.applicant.new@unijos.edu.ng');
    await page.getByPlaceholder('••••••••').fill('password123');

    // Click login and wait for navigation
    await Promise.all([
        page.waitForURL(/.*dashboard/, { timeout: 30000 }),
        page.getByRole('button', { name: /Log In/i }).click()
    ]);

    // Ensure the user profile (member ID) is visible in the sidebar to confirm full hydration
    // Use first() to avoid strict mode violation if it appears in multiple places
    await expect(page.getByText('S2001').first()).toBeVisible({ timeout: 15000 });

    // Save storage state for other tests
    await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
