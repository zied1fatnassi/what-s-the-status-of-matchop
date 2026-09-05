import { test, expect } from '@playwright/test'

test.describe('MatchOp Responsive Layout Tests', () => {
    test('renders landing page responsively without horizontal overflow', async ({ page }) => {
        await page.goto('/?e2eRole=guest')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders student matches page responsively', async ({ page }) => {
        await page.goto('/student/matches?e2eRole=student')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders company intros page responsively', async ({ page }) => {
        await page.goto('/company/intros?e2eRole=company')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders student profile responsively', async ({ page }) => {
        await page.goto('/student/profile?e2eRole=student')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders student external matches responsively', async ({ page }) => {
        await page.goto('/student/external-matches?e2eRole=student')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders student referrals responsively', async ({ page }) => {
        await page.goto('/student/referrals?e2eRole=student')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders company profile responsively', async ({ page }) => {
        await page.goto('/company/profile?e2eRole=company')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders company offers responsively', async ({ page }) => {
        await page.goto('/company/offers?e2eRole=company')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders company matches responsively', async ({ page }) => {
        await page.goto('/company/matches?e2eRole=company')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders admin dashboard responsively', async ({ page }) => {
        await page.goto('/admin/dashboard?e2eRole=admin')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders admin users responsively', async ({ page }) => {
        await page.goto('/admin/users?e2eRole=admin')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders public login page responsively', async ({ page }) => {
        await page.goto('/student/login?e2eRole=guest')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders public about page responsively', async ({ page }) => {
        await page.goto('/about?e2eRole=guest')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })

    test('renders legal terms page responsively', async ({ page }) => {
        await page.goto('/legal/terms?e2eRole=guest')
        await page.waitForLoadState('domcontentloaded')

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    })
})
