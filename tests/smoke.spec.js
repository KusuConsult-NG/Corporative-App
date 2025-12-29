import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('should show login page', async ({ page }) => {
    await page.goto('http://localhost:3000/auth');
    await expect(page.getByText(/Anchorage Welfare Savings and Loans/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Log In/i })).toBeVisible();
});
