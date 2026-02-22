import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests/mobile',
    testMatch: /.*\.spec\.js/,
    timeout: 60000,
    expect: {
        timeout: 10000,
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.015
        }
    },
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    reporter: [['list']],
    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        colorScheme: 'light'
    },
    projects: [
        {
            name: 'mobile-320x568',
            use: { viewport: { width: 320, height: 568 } }
        },
        {
            name: 'mobile-390x844',
            use: { viewport: { width: 390, height: 844 } }
        },
        {
            name: 'tablet-768x1024',
            use: { viewport: { width: 768, height: 1024 } }
        }
    ],
    webServer: {
        command: 'npm run dev -- --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173',
        timeout: 120000,
        reuseExistingServer: !process.env.CI,
        env: {
            VITE_E2E_MOCK_MODE: 'true'
        }
    }
})