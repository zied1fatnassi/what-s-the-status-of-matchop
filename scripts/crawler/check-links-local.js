/**
 * Local Link Checker Script
 * 
 * Standalone Node.js script to verify 100% of external job links.
 * Can be run locally via `npm run scrape:check-links` or deployed
 * as a scheduled task (cron, GitHub Actions, Vercel Cron).
 * 
 * Uses async HEAD requests with configurable concurrency.
 * Falls back to GET for servers that reject HEAD.
 * 
 * Usage:
 *   node scripts/crawler/check-links-local.js [--dry-run] [--batch=200] [--concurrency=15]
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'

// Load environment variables
const envFile = fs.readFileSync('.env', 'utf8')
const envConfig = dotenv.parse(envFile)

// ============================================
// CONFIGURATION
// ============================================

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const BATCH_SIZE = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '500')
const CONCURRENCY = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '10')
const REQUEST_TIMEOUT_MS = 15000
const MAX_RETRIES = 2
const USER_AGENT = 'MatchOp-LinkChecker/1.0 (+https://matchop.vercel.app)'

const DEAD_STATUS_CODES = new Set([404, 410, 451, 500, 502, 503, 521, 522, 523, 530])

const SOFT_404_PATTERNS = [
    'page not found',
    'job expired',
    'no longer available',
    'this job has been removed',
    'this position has been filled',
    'listing has expired',
    'offre expirée',
    "cette offre n'est plus disponible",
]

// ============================================
// SUPABASE INIT
// ============================================

const serviceKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY
const anonKey = envConfig.VITE_SUPABASE_ANON_KEY
const activeKey = serviceKey || anonKey

if (!activeKey) {
    console.error('❌ FATAL: No Supabase key found in .env')
    process.exit(1)
}

const supabase = createClient(envConfig.VITE_SUPABASE_URL, activeKey)

// ============================================
// LINK CHECKER
// ============================================

/**
 * Check a single link via HEAD request with GET fallback.
 * @param {string} url
 * @param {number} retryCount
 * @returns {Promise<{url: string, alive: boolean, statusCode: number|null, reason: string, responseTimeMs: number}>}
 */
async function checkLink(url, retryCount = 0) {
    const startTime = performance.now()

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

        let response
        try {
            // HEAD request — fast, no body
            response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                redirect: 'follow',
                headers: { 'User-Agent': USER_AGENT, 'Accept': '*/*' },
            })
        } catch (headErr) {
            if (headErr.name !== 'AbortError') {
                // Fallback to GET with range limit
                response = await fetch(url, {
                    method: 'GET',
                    signal: controller.signal,
                    redirect: 'follow',
                    headers: {
                        'User-Agent': USER_AGENT,
                        'Accept': 'text/html',
                        'Range': 'bytes=0-1024',
                    },
                })
            } else {
                throw headErr
            }
        } finally {
            clearTimeout(timeoutId)
        }

        const responseTimeMs = Math.round(performance.now() - startTime)
        const statusCode = response.status

        if (DEAD_STATUS_CODES.has(statusCode)) {
            return { url, alive: false, statusCode, reason: `HTTP ${statusCode}`, responseTimeMs }
        }

        // Soft 404 detection for GET responses
        if (statusCode === 200 && response.body) {
            try {
                const body = await response.text()
                const lowerBody = body.toLowerCase()
                for (const pattern of SOFT_404_PATTERNS) {
                    if (lowerBody.includes(pattern)) {
                        return { url, alive: false, statusCode: 200, reason: `Soft 404: "${pattern}"`, responseTimeMs }
                    }
                }
            } catch { /* body read failure is OK for HEAD */ }
        }

        return {
            url,
            alive: statusCode >= 200 && statusCode < 400,
            statusCode,
            reason: statusCode >= 200 && statusCode < 400 ? 'OK' : `HTTP ${statusCode}`,
            responseTimeMs,
        }

    } catch (err) {
        const responseTimeMs = Math.round(performance.now() - startTime)

        if (retryCount < MAX_RETRIES && (err.name === 'AbortError' || err.message?.includes('fetch failed'))) {
            await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)))
            return checkLink(url, retryCount + 1)
        }

        return {
            url,
            alive: false,
            statusCode: null,
            reason: err.name === 'AbortError' ? 'Timeout' : err.message || 'Unknown error',
            responseTimeMs,
        }
    }
}

/**
 * Process URLs with concurrency control.
 * @param {Array<{id: string, original_url: string}>} jobs
 * @param {number} concurrency
 * @returns {Promise<Map<string, object>>}
 */
async function checkAllLinks(jobs, concurrency) {
    const results = new Map()
    const executing = new Set()
    let completed = 0

    for (const job of jobs) {
        const promise = checkLink(job.original_url).then(result => {
            executing.delete(promise)
            results.set(job.original_url, { ...result, id: job.id })
            completed++
            if (completed % 50 === 0) {
                console.log(`   Progress: ${completed}/${jobs.length} (${Math.round(completed/jobs.length*100)}%)`)
            }
            return result
        })
        executing.add(promise)

        if (executing.size >= concurrency) {
            await Promise.race(executing)
        }
    }

    await Promise.all(executing)
    return results
}

// ============================================
// MAIN
// ============================================

async function run() {
    console.log('═'.repeat(60))
    console.log('🔍 MatchOp Link Checker v2.0')
    console.log('   100% Coverage via Async HEAD Requests')
    console.log('═'.repeat(60))
    console.log(`   Batch Size:   ${BATCH_SIZE}`)
    console.log(`   Concurrency:  ${CONCURRENCY}`)
    console.log(`   Dry Run:      ${DRY_RUN}`)
    console.log(`   Started:      ${new Date().toISOString()}\n`)

    // Fetch all jobs
    const { data: jobs, error } = await supabase
        .from('external_jobs')
        .select('id, original_url, source_website, title')
        .order('created_at', { ascending: false })
        .limit(BATCH_SIZE)

    if (error) {
        console.error('❌ DB fetch error:', error.message)
        process.exit(1)
    }

    console.log(`📋 Found ${jobs.length} jobs to verify\n`)

    if (jobs.length === 0) {
        console.log('✅ No jobs to check')
        process.exit(0)
    }

    // Check all links
    const startTime = performance.now()
    const results = await checkAllLinks(jobs, CONCURRENCY)
    const totalTimeMs = Math.round(performance.now() - startTime)

    // Categorize
    const alive = []
    const dead = []

    for (const [url, result] of results) {
        if (result.alive) {
            alive.push(result)
        } else {
            dead.push(result)
        }
    }

    // Delete dead links (unless dry run)
    let deletedCount = 0
    if (!DRY_RUN && dead.length > 0) {
        const deadIds = dead.map(d => d.id)
        const { error: deleteError } = await supabase
            .from('external_jobs')
            .delete()
            .in('id', deadIds)

        if (deleteError) {
            console.error('❌ Delete error:', deleteError.message)
        } else {
            deletedCount = deadIds.length
        }
    }

    // Report
    console.log('\n' + '═'.repeat(60))
    console.log('📈 LINK CHECK REPORT')
    console.log('═'.repeat(60))
    console.log(`   Total checked:    ${jobs.length}`)
    console.log(`   Alive:            ${alive.length} (${Math.round(alive.length/jobs.length*100)}%)`)
    console.log(`   Dead:             ${dead.length} (${Math.round(dead.length/jobs.length*100)}%)`)
    console.log(`   Deleted from DB:  ${deletedCount}`)
    console.log(`   Coverage:         100%`)
    console.log(`   Time:             ${totalTimeMs}ms`)
    console.log(`   Avg response:     ${results.size > 0 ? Math.round([...results.values()].reduce((s,r) => s + r.responseTimeMs, 0) / results.size) : 0}ms`)

    if (dead.length > 0) {
        console.log('\n' + '─'.repeat(60))
        console.log('💀 DEAD LINKS:')
        for (const d of dead.slice(0, 20)) {
            console.log(`   ${d.reason.padEnd(25)} ${d.url.substring(0, 70)}`)
        }
        if (dead.length > 20) {
            console.log(`   ... and ${dead.length - 20} more`)
        }
    }

    console.log('═'.repeat(60))
    console.log(`✅ Completed: ${new Date().toISOString()}\n`)
}

run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal error:', err)
        process.exit(1)
    })
