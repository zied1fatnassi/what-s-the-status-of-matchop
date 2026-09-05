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
        // Mobile Viewports
        { name: 'mobile-320x568', use: { viewport: { width: 320, height: 568 } } },
        { name: 'mobile-360x800', use: { viewport: { width: 360, height: 800 } } },
        { name: 'mobile-390x844', use: { viewport: { width: 390, height: 844 } } },
        { name: 'mobile-393x852', use: { viewport: { width: 393, height: 852 } } },
        { name: 'mobile-430x932', use: { viewport: { width: 430, height: 932 } } },

        // Tablet Viewports
        { name: 'tablet-768x1024', use: { viewport: { width: 768, height: 1024 } } },
        { name: 'tablet-820x1180', use: { viewport: { width: 820, height: 1180 } } },
        { name: 'tablet-1024x1366', use: { viewport: { width: 1024, height: 1366 } } },

        // Desktop Viewports
        { name: 'desktop-1280x720', use: { viewport: { width: 1280, height: 720 } } },
        { name: 'desktop-1280x800', use: { viewport: { width: 1280, height: 800 } } },
        { name: 'desktop-1440x900', use: { viewport: { width: 1440, height: 900 } } },
        { name: 'desktop-1536x864', use: { viewport: { width: 1536, height: 864 } } },
        { name: 'desktop-1920x1080', use: { viewport: { width: 1920, height: 1080 } } }
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