import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8000';
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

export function hasAdminCredentials(): boolean {
    return Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);
}

export async function loginAsAdmin(page: Page): Promise<void> {
    test.skip(
        !hasAdminCredentials(),
        'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated E2E scenarios.',
    );

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[type="email"]', ADMIN_EMAIL!);
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
}

export function collectConsoleErrors(page: Page): string[] {
    const errors: string[] = [];

    page.on('console', (message) => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });
    page.on('pageerror', (error) => {
        errors.push(error.message);
    });

    return errors;
}

export function collectFailedRequests(page: Page): string[] {
    const failed: string[] = [];

    page.on('response', (response) => {
        if (response.status() >= 400 && !response.url().includes('favicon')) {
            failed.push(`${response.status()} ${response.url()}`);
        }
    });

    return failed;
}

export async function selectOption(
    page: Page,
    triggerText: string,
    optionIndex = 0,
): Promise<void> {
    const trigger = page
        .locator(`button[role="combobox"]:near(:text("${triggerText}"))`)
        .or(page.locator('button[role="combobox"]').nth(optionIndex));

    await trigger.first().click();
    await page.locator('[role="option"]').nth(optionIndex).click();
}
