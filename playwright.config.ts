import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const baseURL = process.env.BASE_URL ?? 'http://localhost:8000';
const edgeCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const edgeAvailable =
    process.env.PLAYWRIGHT_ENABLE_EDGE === '1' ||
    (process.platform === 'win32' && edgeCandidates.some(existsSync));

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? 2 : 2,
    reporter: [
        ['list'],
        ['html', { outputFolder: 'tests/e2e/report', open: 'never' }],
    ],
    use: {
        baseURL,
        headless: true,
        screenshot: 'only-on-failure',
        video: 'off',
        trace: 'retain-on-failure',
        actionTimeout: 10000,
        navigationTimeout: 20000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            testIgnore: ['**/auth.setup.ts'],
        },
        ...(edgeAvailable
            ? [
                  {
                      name: 'edge',
                      use: {
                          ...devices['Desktop Edge'],
                          channel: 'msedge' as const,
                      },
                      testIgnore: ['**/auth.setup.ts'],
                  },
              ]
            : []),
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            testIgnore: ['**/auth.setup.ts'],
        },
    ],
});
