import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
        const [k, ...rest] = arg.split('=')
        return [k.replace(/^--/, ''), rest.join('=')]
    })
)

const mode = args.mode || 'real'
const baseUrl = args.base || (mode === 'real' ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:4174')
const outputDir = path.resolve(args.outDir || 'output/playwright')
await fs.mkdir(outputDir, { recursive: true })

const PASS_CONFIG = {
    real: {
        name: 'logged_out_real',
        role: null,
        routes: [
            { path: '/student/signup?ref=QA123', action: 'studentSignupValidation' },
            { path: '/student/swipe', expectedUrlContains: '/student/login' },
            { path: '/student/referrals', expectedUrlContains: '/student/login' },
            { path: '/student/notifications', expectedUrlContains: '/student/login' },
            { path: '/student/profile', expectedUrlContains: '/student/login' },
            { path: '/payments', expectedUrlContains: '/student/login' },
            { path: '/company/login', action: 'companyLoginValidation' },
            { path: '/company/intros', expectedUrlContains: '/company/login' },
            { path: '/company/matches', expectedUrlContains: '/company/login' },
            { path: '/company/archived', expectedUrlContains: '/company/login' },
            { path: '/company/offers', expectedUrlContains: '/company/login' },
            { path: '/company/chat' },
            { path: '/admin/payments', expectedUrlContains: '/student/login' },
        ],
        extraChecks: ['tabNavigation'],
    },
    student: {
        name: 'logged_in_student_mock',
        role: 'student',
        routes: [
            { path: '/student/signup?ref=QA123', expectedUrlContains: '/student/swipe' },
            { path: '/student/swipe', action: 'studentSwipeChecks' },
            { path: '/student/referrals' },
            { path: '/student/notifications' },
            { path: '/student/profile' },
            { path: '/payments' },
        ],
        extraChecks: ['missingConfigProbe'],
    },
    company: {
        name: 'logged_in_company_mock',
        role: 'company',
        routes: [
            { path: '/company/login', expectedUrlContains: '/company/intros' },
            { path: '/company/intros' },
            { path: '/company/matches' },
            { path: '/company/archived', action: 'companyArchivedCheck' },
            { path: '/company/offers' },
            { path: '/company/chat' },
        ],
        extraChecks: [],
    },
    admin: {
        name: 'logged_in_admin_mock',
        role: 'admin',
        routes: [
            { path: '/admin/payments' },
        ],
        extraChecks: [],
    },
}

if (!PASS_CONFIG[mode]) {
    console.error(`Unsupported mode: ${mode}`)
    process.exit(1)
}

const config = PASS_CONFIG[mode]

function sanitizeRoute(routePath) {
    return routePath
        .replace(/^\/+/, '')
        .replace(/\?.*$/, '')
        .replace(/[^a-zA-Z0-9/_-]/g, '_')
        .replace(/\//g, '__') || 'root'
}

function normalizedEndpoint(urlString) {
    try {
        const url = new URL(urlString)
        return `${url.origin}${url.pathname}`
    } catch {
        return urlString
    }
}

function classifyConsoleEntry(entry) {
    const text = String(entry.text || '').toLowerCase()
    return {
        hydration: text.includes('hydration'),
        performance: text.includes('[violation]') || text.includes('long task') || text.includes('non-passive') || text.includes('forced reflow'),
    }
}

async function runRoute(page, routeConfig) {
    const routeResult = {
        route: routeConfig.path,
        startedAt: new Date().toISOString(),
        responseStatus: null,
        finalUrl: null,
        expectedUrlContains: routeConfig.expectedUrlContains || null,
        expectedUrlMatched: null,
        navError: null,
        missingConfigScreen: false,
        console: [],
        pageErrors: [],
        requests: [],
        requestFailures: [],
        responseFailures: [],
        action: {
            name: routeConfig.action || null,
            ok: true,
            details: [],
        },
        screenshotPath: null,
    }

    page.on('console', (msg) => {
        const type = msg.type()
        if (type === 'error' || type === 'warning' || type === 'warn') {
            const text = msg.text()
            const flags = classifyConsoleEntry({ text })
            routeResult.console.push({ type, text, flags })
        }
    })

    page.on('pageerror', (error) => {
        routeResult.pageErrors.push({ message: String(error?.message || error), stack: String(error?.stack || '') })
    })

    page.on('requestfailed', (request) => {
        routeResult.requestFailures.push({
            method: request.method(),
            url: request.url(),
            endpoint: normalizedEndpoint(request.url()),
            failureText: request.failure()?.errorText || 'unknown',
        })
    })

    page.on('request', (request) => {
        routeResult.requests.push({
            method: request.method(),
            url: request.url(),
            endpoint: normalizedEndpoint(request.url()),
            resourceType: request.resourceType(),
        })
    })

    page.on('response', (response) => {
        const status = response.status()
        if (status >= 400) {
            routeResult.responseFailures.push({
                method: response.request().method(),
                url: response.url(),
                endpoint: normalizedEndpoint(response.url()),
                status,
            })
        }
    })

    try {
        const targetUrl = new URL(`${baseUrl}${routeConfig.path}`)
        if (config.role) {
            targetUrl.searchParams.set('e2eRole', config.role)
        }
        const response = await page.goto(targetUrl.toString(), { waitUntil: 'networkidle', timeout: 30000 })
        routeResult.responseStatus = response?.status() ?? null
        await page.waitForTimeout(750)
    } catch (error) {
        routeResult.navError = String(error?.message || error)
    }

    routeResult.finalUrl = page.url()
    if (routeConfig.expectedUrlContains) {
        routeResult.expectedUrlMatched = routeResult.finalUrl.includes(routeConfig.expectedUrlContains)
    }

    routeResult.missingConfigScreen = await page.locator('text=Missing configuration').count() > 0
    routeResult.notFoundScreen = await page.locator('text=/page not found|404/i').count() > 0

    if (routeConfig.action) {
        try {
            await runAction(page, routeResult, routeConfig.action)
        } catch (error) {
            routeResult.action.ok = false
            routeResult.action.details.push(`Action crashed: ${String(error?.message || error)}`)
        }
    }

    const shotPath = path.join(outputDir, `${config.name}_${sanitizeRoute(routeConfig.path)}.png`)
    await page.screenshot({ path: shotPath, fullPage: true })
    routeResult.screenshotPath = shotPath
    routeResult.finishedAt = new Date().toISOString()
    return routeResult
}

async function runAction(page, routeResult, actionName) {
    if (actionName === 'studentSignupValidation') {
        const submit = page.locator('form button[type="submit"]').first()
        const submitExists = await submit.count() > 0
        routeResult.action.details.push(`submit_button_found=${submitExists}`)
        if (!submitExists) {
            routeResult.action.ok = false
            return
        }
        await submit.click()
        await page.waitForTimeout(300)
        const errorVisible = await page.locator('.auth-error, .student-auth-feedback.error').first().isVisible().catch(() => false)
        const invalidFieldCount = await page.locator('form :invalid').count().catch(() => 0)
        const submitDisabled = await submit.isDisabled().catch(() => null)
        routeResult.action.details.push(`validation_error_visible=${errorVisible}`)
        routeResult.action.details.push(`invalid_field_count=${invalidFieldCount}`)
        routeResult.action.details.push(`submit_disabled_after_click=${submitDisabled}`)
        if (!errorVisible && invalidFieldCount === 0) routeResult.action.ok = false
        return
    }

    if (actionName === 'companyLoginValidation') {
        const email = page.locator('input[type="email"]').first()
        const password = page.locator('input[type="password"]').first()
        const submit = page.locator('form button[type="submit"]').first()
        if (await email.count() === 0 || await password.count() === 0 || await submit.count() === 0) {
            routeResult.action.ok = false
            routeResult.action.details.push('login_form_elements_missing=true')
            return
        }

        await email.fill('invalid-email')
        await password.fill('abc12345')
        await submit.click()
        await page.waitForTimeout(350)

        const errorVisible = await page.locator('.auth-error').first().isVisible().catch(() => false)
        const invalidFieldCount = await page.locator('form :invalid').count().catch(() => 0)
        const isBusy = await submit.isDisabled().catch(() => false)
        routeResult.action.details.push(`validation_error_visible=${errorVisible}`)
        routeResult.action.details.push(`invalid_field_count=${invalidFieldCount}`)
        routeResult.action.details.push(`submit_disabled_post_validation=${isBusy}`)
        if (!errorVisible && invalidFieldCount === 0) routeResult.action.ok = false
        return
    }

    if (actionName === 'studentSwipeChecks') {
        let adjustBtn = page.getByRole('button', { name: /Adjust preferences/i })
        let switchGlobalBtn = page.getByRole('button', { name: /Switch to Global/i })
        let unlockPremiumBtn = page.getByRole('button', { name: /Unlock Premium|Upgrade to unlock Global|Renew Premium|Join waitlist/i })
        let hasAdjust = await adjustBtn.count() > 0
        let hasSwitch = await switchGlobalBtn.count() > 0
        let hasUnlockPremium = await unlockPremiumBtn.count() > 0

        if (!hasAdjust) {
            await page.evaluate(() => {
                window.localStorage.setItem(
                    'matchop_student_swipe_preferences',
                    JSON.stringify({
                        locationMode: 'onsite',
                        opportunityType: 'all',
                        category: 'all',
                    })
                )
            })
            await page.reload({ waitUntil: 'networkidle' })
            await page.waitForTimeout(250)
            adjustBtn = page.getByRole('button', { name: /Adjust preferences/i })
            switchGlobalBtn = page.getByRole('button', { name: /Switch to Global/i })
            unlockPremiumBtn = page.getByRole('button', { name: /Unlock Premium|Upgrade to unlock Global|Renew Premium|Join waitlist/i })
            hasAdjust = await adjustBtn.count() > 0
            hasSwitch = await switchGlobalBtn.count() > 0
            hasUnlockPremium = await unlockPremiumBtn.count() > 0
            routeResult.action.details.push('forced_local_empty_state_via_preferences=true')
        }

        routeResult.action.details.push(`empty_state_adjust_preferences_cta=${hasAdjust}`)
        routeResult.action.details.push(`empty_state_switch_global_cta=${hasSwitch}`)
        routeResult.action.details.push(`empty_state_unlock_premium_cta=${hasUnlockPremium}`)

        if (!hasAdjust || (!hasSwitch && !hasUnlockPremium)) {
            routeResult.action.ok = false
        }

        if (hasAdjust) {
            await adjustBtn.first().focus()
            await adjustBtn.first().click()
            await page.waitForTimeout(250)
            const dialog = page.locator('[role="dialog"]')
            const dialogVisible = await dialog.isVisible().catch(() => false)
            routeResult.action.details.push(`preferences_dialog_visible_after_open=${dialogVisible}`)

            const closeWithAria = await page.locator('button[aria-label="Close preferences"]').count()
            routeResult.action.details.push(`preferences_close_button_aria_label_count=${closeWithAria}`)

            await page.keyboard.press('Escape')
            await page.waitForTimeout(250)
            const dialogStillVisible = await dialog.isVisible().catch(() => false)
            const focusBackToTrigger = await page.evaluate(() => {
                const active = document.activeElement
                return !!active && /adjust preferences/i.test(active.textContent || '')
            })
            routeResult.action.details.push(`preferences_dialog_closed_via_esc=${!dialogStillVisible}`)
            routeResult.action.details.push(`focus_returned_to_trigger=${focusBackToTrigger}`)
            if (dialogStillVisible) routeResult.action.ok = false
        } else {
            routeResult.action.ok = false
        }

        const requestTally = new Map()
        const apiRequests = routeResult.requests.filter((request) => request.resourceType === 'fetch' || request.resourceType === 'xhr')
        for (const response of apiRequests) {
            const key = response.endpoint
            requestTally.set(key, (requestTally.get(key) || 0) + 1)
        }
        const imageRequests = routeResult.requests.filter((request) => request.resourceType === 'image')
        const imageRequestTally = new Map()
        for (const request of imageRequests) {
            imageRequestTally.set(request.endpoint, (imageRequestTally.get(request.endpoint) || 0) + 1)
        }
        const repeatedApiEndpoints = [...requestTally.entries()].filter(([, count]) => count >= 8)
        const repeatedImageEndpoints = [...imageRequestTally.entries()].filter(([, count]) => count >= 6)
        routeResult.action.details.push(`api_request_count=${apiRequests.length}`)
        routeResult.action.details.push(`image_request_count=${imageRequests.length}`)
        routeResult.action.details.push(`repeated_api_endpoints_over_8=${repeatedApiEndpoints.length}`)
        routeResult.action.details.push(`repeated_image_endpoints_over_6=${repeatedImageEndpoints.length}`)
        if (repeatedApiEndpoints.length > 0) {
            routeResult.action.details.push(`repeated_api_endpoints=${JSON.stringify(repeatedApiEndpoints.slice(0, 3))}`)
        }
        if (repeatedImageEndpoints.length > 0) {
            routeResult.action.details.push(`repeated_image_endpoints=${JSON.stringify(repeatedImageEndpoints.slice(0, 3))}`)
        }
        return
    }

    if (actionName === 'companyArchivedCheck') {
        const filterButtons = page.locator('.archived-filters button')
        if (await filterButtons.count() >= 3) {
            await filterButtons.nth(1).click()
            await page.waitForTimeout(200)
        }
        const emptyStateVisible = await page.locator('.archived-empty').first().isVisible().catch(() => false)
        routeResult.action.details.push(`archived_state_visible=${emptyStateVisible}`)
        routeResult.action.details.push(`archived_page_error_count=${routeResult.pageErrors.length}`)
        if (routeResult.pageErrors.length > 0) {
            routeResult.action.ok = false
        }
        return
    }
}

async function runExtraCheck(context, checkName) {
    if (checkName === 'tabNavigation') {
        const page = await context.newPage()
        const details = {
            name: 'tabNavigation',
            ok: true,
            focusTrail: [],
            note: '',
        }
        await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 30000 })
        for (let i = 0; i < 6; i += 1) {
            await page.keyboard.press('Tab')
            const active = await page.evaluate(() => {
                const el = document.activeElement
                if (!el) return null
                return {
                    tag: el.tagName,
                    id: el.id || null,
                    ariaLabel: el.getAttribute('aria-label') || null,
                    text: (el.textContent || '').trim().slice(0, 80),
                }
            })
            details.focusTrail.push(active)
        }
        details.note = 'Tab order captured from landing page for quick keyboard navigation sanity check.'
        await page.close()
        return details
    }

    if (checkName === 'missingConfigProbe') {
        const page = await context.newPage()
        const details = {
            name: 'missingConfigProbe',
            ok: true,
            missingConfigurationFound: false,
        }
        await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 30000 })
        details.missingConfigurationFound = await page.locator('text=Missing configuration').count() > 0
        await page.close()
        return details
    }

    return { name: checkName, ok: true, note: 'No-op check' }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

const routeResults = []
for (const routeConfig of config.routes) {
    const page = await context.newPage()
    const result = await runRoute(page, routeConfig)
    routeResults.push(result)
    await page.close()
}

const extraChecks = []
for (const checkName of config.extraChecks) {
    const result = await runExtraCheck(context, checkName)
    extraChecks.push(result)
}

await context.close()
await browser.close()

const consoleByRoute = {}
const networkByEndpoint = {}
const securitySignal = []

for (const result of routeResults) {
    consoleByRoute[result.route] = {
        consoleCount: result.console.length,
        pageErrorCount: result.pageErrors.length,
        messages: [...result.console.map((item) => item.text), ...result.pageErrors.map((item) => item.message)],
    }

    const networkItems = [...result.requestFailures, ...result.responseFailures]
    for (const entry of networkItems) {
        const endpoint = entry.endpoint || normalizedEndpoint(entry.url)
        const statusOrFailure = entry.status || entry.failureText || 'unknown'
        const key = `${endpoint}::${statusOrFailure}`
        networkByEndpoint[key] = (networkByEndpoint[key] || 0) + 1

        const textBlob = JSON.stringify(entry).toLowerCase()
        if (textBlob.includes('401') || textBlob.includes('403') || textBlob.includes('cors')) {
            securitySignal.push({ route: result.route, entry })
        }
    }
}

const report = {
    mode,
    baseUrl,
    role: config.role,
    generatedAt: new Date().toISOString(),
    routeResults,
    extraChecks,
    summary: {
        routeCount: routeResults.length,
        withConsoleIssues: routeResults.filter((r) => r.console.length > 0 || r.pageErrors.length > 0).length,
        withNetworkIssues: routeResults.filter((r) => r.requestFailures.length > 0 || r.responseFailures.length > 0).length,
        missingConfigScreens: routeResults.filter((r) => r.missingConfigScreen).map((r) => r.route),
        consoleByRoute,
        networkByEndpoint,
        securitySignal,
    },
}

const outFile = path.join(outputDir, `audit-${mode}.json`)
await fs.writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

console.log(`WROTE_REPORT=${outFile}`)
console.log(`ROUTES=${report.summary.routeCount}`)
console.log(`CONSOLE_ISSUE_ROUTES=${report.summary.withConsoleIssues}`)
console.log(`NETWORK_ISSUE_ROUTES=${report.summary.withNetworkIssues}`)
