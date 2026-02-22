import { test, expect } from '@playwright/test'

const guestRoutes = [
    '/',
    '/about',
    '/contact',
    '/student/login',
    '/student/signup',
    '/company/login',
    '/company/signup',
    '/forgot-password',
    '/reset-password',
    '/legal/terms',
    '/legal/privacy',
    '/legal/cookies'
]

const studentRoutes = [
    '/dashboard',
    '/student/swipe',
    '/student/matches',
    '/student/global-jobs',
    '/student/offers',
    '/student/profile',
    '/student/chat/test-match'
]

const companyRoutes = [
    '/company/profile',
    '/company/post-offer',
    '/company/candidates',
    '/company/intros',
    '/company/matches',
    '/company/chat/test-match'
]

const adminRoutes = [
    '/admin/dashboard',
    '/admin/users',
    '/admin/offers',
    '/admin/companies',
    '/admin/reports',
    '/admin/analytics',
    '/admin/settings'
]

const withRole = (route, role) => {
    const separator = route.includes('?') ? '&' : '?'
    return `${route}${separator}e2eRole=${role}`
}

async function gotoRoleRoute(page, route, role) {
    await page.goto(withRole(route, role), { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(250)
}

async function assertNoHorizontalOverflow(page, route) {
    const dimensions = await page.evaluate(() => ({
        htmlWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth
    }))

    expect(
        Math.max(dimensions.htmlWidth, dimensions.bodyWidth),
        `Horizontal overflow detected on ${route}`
    ).toBeLessThanOrEqual(dimensions.viewportWidth + 1)
}

async function assertPrimaryUiVisible(page, route) {
    await expect(page.locator('main'), `Main content not visible on ${route}`).toBeVisible()

    const primary = page.locator('main button:visible, main a:visible, main input:visible, main textarea:visible, main select:visible').first()
    if (await primary.count()) {
        await expect(primary, `No primary controls visible on ${route}`).toBeVisible()
    }
}

test.describe('Mobile Route Coverage', () => {
    const suites = [
        { role: 'guest', routes: guestRoutes },
        { role: 'student', routes: studentRoutes },
        { role: 'company', routes: companyRoutes },
        { role: 'admin', routes: adminRoutes }
    ]

    for (const suite of suites) {
        test(`${suite.role} routes render without horizontal overflow`, async ({ page }) => {
            for (const route of suite.routes) {
                await gotoRoleRoute(page, route, suite.role)
                await assertPrimaryUiVisible(page, route)
                await assertNoHorizontalOverflow(page, route)
            }
        })
    }
})

test('Mobile navbar opens/closes and restores body scroll lock', async ({ page }) => {
    await gotoRoleRoute(page, '/student/swipe', 'student')

    const menuToggle = page.locator('.navbar-toggle')
    const menuPanel = page.locator('.navbar-links')

    await expect(menuToggle).toBeVisible()

    await menuToggle.click()
    await expect(menuPanel).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('navbar-menu-open'))).toBe(true)

    await page.keyboard.press('Escape')
    await expect(menuPanel).not.toBeVisible()
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('navbar-menu-open'))).toBe(false)

    await menuToggle.click()
    await expect(menuPanel).toBeVisible()
    await page.locator('.navbar-links .navbar-link').first().click()
    await expect(menuPanel).not.toBeVisible()
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('navbar-menu-open'))).toBe(false)
})

test('Modal opens/closes with overlay scroll lock', async ({ page }) => {
    await gotoRoleRoute(page, '/student/swipe', 'student')

    const swipeCard = page.locator('.swipe-card-top').first()
    await expect(swipeCard).toBeVisible()

    await swipeCard.click()

    const modalOverlay = page.locator('.offer-modal-overlay')
    await expect(modalOverlay).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('overlay-open'))).toBe(true)

    await page.keyboard.press('Escape')
    await expect(modalOverlay).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('overlay-open'))).toBe(false)
})

test('Student chat input remains visible near bottom safe area', async ({ page }) => {
    await gotoRoleRoute(page, '/student/chat/test-match', 'student')

    const inputContainer = page.locator('.chat-input-container')
    await expect(inputContainer).toBeVisible()

    const [box, viewport] = await Promise.all([
        inputContainer.boundingBox(),
        page.viewportSize()
    ])

    expect(box).not.toBeNull()
    expect(viewport).not.toBeNull()

    const inputBottom = box.y + box.height
    const lowerHalfThreshold = viewport.height * 0.55

    expect(inputBottom).toBeGreaterThanOrEqual(lowerHalfThreshold)
    expect(inputBottom).toBeLessThanOrEqual(viewport.height + 1)
})

test('Mobile screenshot baselines for key route groups', async ({ page }) => {
    const snapshots = [
        { name: 'public-home', route: '/', role: 'guest' },
        { name: 'student-swipe', route: '/student/swipe', role: 'student' },
        { name: 'company-candidates', route: '/company/candidates', role: 'company' },
        { name: 'admin-dashboard', route: '/admin/dashboard', role: 'admin' }
    ]

    for (const snapshot of snapshots) {
        await gotoRoleRoute(page, snapshot.route, snapshot.role)
        await expect(page).toHaveScreenshot(`${snapshot.name}.png`, {
            fullPage: true,
            animations: 'disabled'
        })
    }
})
