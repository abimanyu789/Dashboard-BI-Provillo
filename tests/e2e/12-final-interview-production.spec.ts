import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { collectConsoleErrors, loginAsAdmin } from './helpers';

const productionId = process.env.E2E_PRODUCTION_ID;

async function openProductionFixture(page: Page) {
    test.skip(
        !productionId,
        'Set E2E_PRODUCTION_ID to a safe production fixture for final-interview smoke scenarios.',
    );

    await page.goto(`/produksi/${productionId}`);
    await page.waitForLoadState('networkidle');
}

test.describe('Final interview production revision', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('TC_MFG_008 / TC_MFG_010 shows planned material, availability, and shortage', async ({
        page,
    }) => {
        const errors = collectConsoleErrors(page);
        await openProductionFixture(page);

        await expect(page.getByText('Status Material Produksi')).toBeVisible();
        await expect(
            page.getByRole('columnheader', { name: 'Rencana' }),
        ).toBeVisible();
        await expect(
            page.getByRole('columnheader', { name: 'Tersedia' }),
        ).toBeVisible();
        await expect(
            page.getByRole('columnheader', { name: 'Kekurangan' }),
        ).toBeVisible();
        expect(errors).toHaveLength(0);
    });

    test('TC_MFG_013 shows QC disposition, rework, and wage-basis sections', async ({
        page,
    }) => {
        await openProductionFixture(page);

        await expect(page.getByText('Antrean Rework Aktif')).toBeVisible();
        await expect(page.getByText('Dasar Perhitungan Upah')).toBeVisible();
        await expect(page.getByText('Riwayat QC & Rework')).toBeVisible();
    });

    test('TC_MFG_020 explains that cancellation returns only unused issued material', async ({
        page,
    }) => {
        await openProductionFixture(page);

        const cancelButton = page.getByRole('button', {
            name: 'Batalkan Produksi',
        });
        test.skip(
            !(await cancelButton.isVisible()),
            'Fixture is not an active production.',
        );
        await cancelButton.click();

        await expect(
            page.getByText(
                /hanya bahan yang sudah diterbitkan tetapi belum digunakan/i,
            ),
        ).toBeVisible();
    });

    test('TC_MFG_022 shows auditable material movement history', async ({
        page,
    }) => {
        await openProductionFixture(page);

        await expect(
            page.getByText('Riwayat Pergerakan Material'),
        ).toBeVisible();
        await expect(page.locator('body')).not.toContainText(
            /whoops|exception/i,
        );
    });
});
