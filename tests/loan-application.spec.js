import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Loan Application Flow', () => {
    test.beforeEach(async ({ page }) => {
        // storageState is automatically loaded from playwright/.auth/user.json
        await page.goto('/member/dashboard');
        // Wait for profile to load to ensure session is active and app is ready
        await expect(page.getByText('S2001').first()).toBeVisible({ timeout: 15000 });
    });

    test('should apply for a Swift Relief Loan', async ({ page }) => {
        // 1. Navigate via Sidebar
        await page.getByRole('link', { name: 'Loans', exact: true }).click();
        await expect(page).toHaveURL(/.*member\/loans/);

        // Wait for loading to finish
        await expect(page.getByText('Loading your loans...')).not.toBeVisible({ timeout: 15000 });

        // 2. Click "Apply for Loan" button
        await page.getByRole('button', { name: /Apply (for )?(.+ )?Loan/i }).first().click();

        // Wait for the new page to load
        await expect(page).toHaveURL(/.*loans\/apply/, { timeout: 10000 });
        await expect(page.getByRole('heading', { name: 'New Loan Application' })).toBeVisible({ timeout: 10000 });

        // 3. Fill Loan Details
        const loanTypeSelect = page.locator('select').first();
        await expect(loanTypeSelect).toBeVisible({ timeout: 10000 });
        await loanTypeSelect.selectOption({ label: 'Swift Relief Loan' });

        // Wait for eligibility check to finish
        await expect(page.getByText('Checking eligibility...')).not.toBeVisible({ timeout: 10000 });

        // Amount and Duration should be auto-filled for Swift Relief
        await expect(page.locator('input[name="amount"]')).toHaveValue('30000');
        await expect(page.locator('input[name="duration"]')).toHaveValue('3');

        await page.locator('input[name="currentSalary"]').fill('150000');

        // 4. Upload Payslips
        const file1 = path.resolve('tests/fixtures/payslip1.pdf');
        const file2 = path.resolve('tests/fixtures/payslip2.pdf');

        await page.setInputFiles('input[type="file"]', [file1, file2]);
        await expect(page.getByText('payslip1.pdf')).toBeVisible();

        await page.getByPlaceholder('Briefly explain why you need this loan...').fill('Emergency medical expenses');

        // 5. Select Guarantor
        await page.getByPlaceholder('Search by name or member ID...').fill('S2002');
        await expect(page.getByRole('button', { name: /ID: S2002/i }).first()).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: /ID: S2002/i }).first().click();
        await expect(page.getByText('ID: S2002')).toBeVisible();

        // 6. Agree to terms
        await page.locator('input[type="checkbox"]').first().check();

        // 7. Submit
        await page.getByRole('button', { name: /Submit Application/i }).click();

        // 8. Verify Success
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Loan application submitted successfully');
            await dialog.accept();
        });

        await expect(page).toHaveURL(/.*member\/loans/, { timeout: 15000 });
    });
});
