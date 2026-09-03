import { test, expect } from '@playwright/test'

test.describe('Student Discovery Vertical Feed Responsive Tests', () => {
    test('renders vertical job feed on student discovery route', async ({ page }) => {
        await page.goto('/student/swipe?e2eRole=student')

        // Verify page container is present
        const feedPage = page.locator('.vertical-feed-page')
        await expect(feedPage).toBeVisible({ timeout: 15000 })

        // Check that there is no horizontal scrollbar
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)

        // Verify student navigation exists
        const bottomNav = page.locator('.student-bottom-nav')
        await expect(bottomNav).toBeVisible()
    })

    test('renders opportunity action controls with accessible touch targets', async ({ page }) => {
        await page.goto('/student/swipe?e2eRole=student')

        const feedPage = page.locator('.vertical-feed-page')
        await expect(feedPage).toBeVisible({ timeout: 15000 })

        // Wait for either opportunity item or empty state to appear
        const opportunityItem = page.locator('.vertical-opportunity-item').first()
        const emptyState = page.locator('.feed-empty-state-screen')

        await expect(opportunityItem.or(emptyState)).toBeVisible({ timeout: 15000 })

        if (await opportunityItem.isVisible()) {
            const applyBtn = page.locator('.action-btn-apply').first()
            const ignoreBtn = page.locator('.action-btn-ignore').first()

            await expect(applyBtn).toBeVisible()
            await expect(ignoreBtn).toBeVisible()

            // Verify touch target height >= 44px
            const applyBox = await applyBtn.boundingBox()
            expect(applyBox?.height).toBeGreaterThanOrEqual(44)

            const ignoreBox = await ignoreBtn.boundingBox()
            expect(ignoreBox?.height).toBeGreaterThanOrEqual(44)
        } else {
            await expect(emptyState).toBeVisible()
        }
    })
})
