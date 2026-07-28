import { test as setup } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCredentials } from './helpers';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
    setup.skip(
        !hasAdminCredentials(),
        'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to create authenticated storage state.',
    );

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', ADMIN_EMAIL!);
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await page.context().storageState({ path: authFile });
});
