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
})
