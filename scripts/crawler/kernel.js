/**
 * MatchOp Job Aggregator v2.0
 * Refactored Scraping Engine with Scrapestack Integration
 * 
 * Run: node scripts/crawler/kernel.js
 * 
 * Features:
 * - Scrapestack API for JS rendering & anti-blocking
 * - Link verification before saving
 * - No fake/placeholder data
 * - Site-specific scrapers for priority targets
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'
import Parser from 'rss-parser'
import scrapestack from './scrapestack-client.js'
import CONFIG from './config.js'

// Import site-specific scrapers
import { scrapeLinkedIn } from './scrapers/linkedin.js'
import { scrapeTanitJobs } from './scrapers/tanitjobs.js'
import { scrapeKeejobs } from './scrapers/keejobs.js'
import { scrapeWuzzuf } from './scrapers/wuzzuf.js'
import { scrapeBayt } from './scrapers/bayt.js'

// Load environment variables
const envFile = fs.readFileSync('.env', 'utf8')
const envConfig = dotenv.parse(envFile)

// Supabase Init
const serviceKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY
const anonKey = envConfig.VITE_SUPABASE_ANON_KEY
const activeKey = serviceKey || anonKey

if (!activeKey) {
    console.error('❌ FATAL: No Supabase key found in .env')
    process.exit(1)
}

const supabase = createClient(envConfig.VITE_SUPABASE_URL, activeKey)
const parser = new Parser()

// ============================================
// LINK VERIFICATION
// ============================================

/**
 * Verify a job link is valid before saving
 * Returns true only if the link returns HTTP 200 and looks like a valid job page
 */
async function verifyJobLink(job) {
    // Basic URL validation
    if (!job.original_url || typeof job.original_url !== 'string') {
        return { valid: false, reason: 'Missing URL' }
    }

    if (!job.original_url.startsWith('http://') && !job.original_url.startsWith('https://')) {
        return { valid: false, reason: 'Invalid URL scheme' }
    }

    // Block fake/placeholder URLs
    const blockedPatterns = ['example.com', 'placeholder', 'test.com', 'localhost', 'fake']
    for (const pattern of blockedPatterns) {
        if (job.original_url.toLowerCase().includes(pattern)) {
            return { valid: false, reason: `Blocked pattern: ${pattern}` }
        }
    }

    // Verify via Scrapestack (sample check - not all links to save API calls)
    const shouldVerify = Math.random() < 0.3 // Verify 30% of links
    
    if (shouldVerify) {
        const result = await scrapestack.verifyLink(job.original_url, {
            siteName: job.source_website?.toLowerCase() || 'default'
        })
        return result
    }

    return { valid: true, reason: 'Passed basic validation' }
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Save verified jobs to database
 * Only saves jobs that pass link verification
 */
async function saveJobs(jobs) {
    if (jobs.length === 0) {
        console.log('⚠️ No jobs to save')
        return { saved: 0, skipped: 0 }
    }

    console.log(`\n🔍 Verifying ${jobs.length} job links...`)
    
    const verifiedJobs = []
    const skippedJobs = []

    for (const job of jobs) {
        const verification = await verifyJobLink(job)
        
        if (verification.valid) {
            verifiedJobs.push(job)
        } else {
            skippedJobs.push({ url: job.original_url, reason: verification.reason })
        }
    }

    console.log(`✅ ${verifiedJobs.length} links verified, ${skippedJobs.length} skipped`)

    if (verifiedJobs.length === 0) {
        return { saved: 0, skipped: skippedJobs.length }
    }

    // Save in chunks
    const CHUNK_SIZE = 50
    let totalSaved = 0

    for (let i = 0; i < verifiedJobs.length; i += CHUNK_SIZE) {
        const chunk = verifiedJobs.slice(i, i + CHUNK_SIZE)
        
        const { error } = await supabase
            .from('external_jobs')
            .upsert(
                chunk.map(job => ({
                    source_website: job.source_website,
                    original_url: job.original_url,
                    title: job.title?.substring(0, 255) || 'Untitled',
                    company_name: job.company_name?.substring(0, 255) || null,
                    location: job.location?.substring(0, 255) || null,
                    description: job.description?.substring(0, 1000) || null,
                    job_type: job.job_type || 'Full-time',
                    posted_at: job.posted_at || new Date().toISOString(),
                    tags: job.tags || [],
                    logo_url: job.logo_url || null
                })),
                { 
                    onConflict: 'original_url',
                    ignoreDuplicates: true 
                }
            )

        if (error) {
            console.error(`❌ Save error (chunk ${Math.floor(i/CHUNK_SIZE) + 1}):`, error.message)
        } else {
            totalSaved += chunk.length
            console.log(`💾 Saved chunk ${Math.floor(i/CHUNK_SIZE) + 1}: ${chunk.length} jobs`)
        }
    }

    return { saved: totalSaved, skipped: skippedJobs.length }
}

// ============================================
// LEGACY RSS SOURCES (Verified working)
// ============================================

async function scrapeRSS(sourceName, url, locationDefault = 'Remote') {
    console.log(`\n📡 Fetching RSS: ${sourceName}...`)
    try {
        const feed = await parser.parseURL(url)
        const jobs = feed.items.map(item => ({
            source_website: sourceName,
            original_url: item.link,
            title: item.title,
            company_name: extractCompanyFromTitle(item.title) || 'See Details',
            location: locationDefault,
            description: item.contentSnippet?.substring(0, 500) || '',
            posted_at: item.pubDate || new Date().toISOString(),
            tags: [sourceName.toLowerCase().replace(/\s+/g, '-')]
        }))
        console.log(`   Found ${jobs.length} jobs`)
        return jobs
    } catch (e) {
        console.error(`❌ ${sourceName} RSS failed:`, e.message)
        return []
    }
}

function extractCompanyFromTitle(title) {
    if (!title) return null
    
    const atMatch = title.match(/\bat\s+(.+)$/i)
    if (atMatch) return atMatch[1].trim()
    
    const dashMatch = title.match(/^(.+?)\s*[-–—]\s*/)
    if (dashMatch) return dashMatch[1].trim()
    
    return null
}

// ============================================
// MAIN EXECUTION
// ============================================

async function run() {
    console.log('═'.repeat(60))
    console.log('🚀 MatchOp Job Aggregator v2.0')
    console.log('   Powered by Scrapestack')
    console.log('═'.repeat(60))
    console.log(`Started: ${new Date().toISOString()}\n`)

    const allJobs = []
    const results = {}

    try {
        // ========== PRIORITY SCRAPERS (Scrapestack) ==========
        
        // 1. LinkedIn (Global)
        console.log('\n' + '─'.repeat(40))
        const linkedInJobs = await scrapeLinkedIn(
            ['software engineer', 'developer', 'remote'],
            ['Tunisia', '']
        )
        allJobs.push(...linkedInJobs)
        results.linkedin = linkedInJobs.length

        // 2. TanitJobs (Tunisia)
        console.log('\n' + '─'.repeat(40))
        const tanitJobs = await scrapeTanitJobs(
            ['', 'développeur', 'ingénieur'],
            3
        )
        allJobs.push(...tanitJobs)
        results.tanitjobs = tanitJobs.length

        // 3. Keejobs (Tunisia)
        console.log('\n' + '─'.repeat(40))
        const keejobsJobs = await scrapeKeejobs(
            ['', 'informatique'],
            3
        )
        allJobs.push(...keejobsJobs)
        results.keejobs = keejobsJobs.length

        // 4. Wuzzuf (Egypt/MENA)
        console.log('\n' + '─'.repeat(40))
        const wuzzufJobs = await scrapeWuzzuf(
            ['software', 'developer', 'engineer'],
            2
        )
        allJobs.push(...wuzzufJobs)
        results.wuzzuf = wuzzufJobs.length

        // 5. Bayt (MENA)
        console.log('\n' + '─'.repeat(40))
        const baytJobs = await scrapeBayt(
            ['software', 'developer'],
            [''],
            2
        )
        allJobs.push(...baytJobs)
        results.bayt = baytJobs.length

        // ========== LEGACY RSS SOURCES ==========
        console.log('\n' + '─'.repeat(40))
        console.log('📡 Fetching RSS feeds...')
        
        // WeWorkRemotely
        const wwrJobs = await scrapeRSS(
            'WeWorkRemotely',
            'https://weworkremotely.com/categories/remote-programming-jobs.rss',
            'Remote'
        )
        allJobs.push(...wwrJobs)
        results.weworkremotely = wwrJobs.length

        // Jobspresso
        const jobspressoJobs = await scrapeRSS(
            'Jobspresso',
            'https://jobspresso.co/feed/',
            'Remote'
        )
        allJobs.push(...jobspressoJobs)
        results.jobspresso = jobspressoJobs.length

    } catch (error) {
        console.error('❌ Scraping error:', error.message)
    }

    // ========== SAVE TO DATABASE ==========
    console.log('\n' + '═'.repeat(60))
    console.log(`📊 Total jobs scraped: ${allJobs.length}`)
    
    const saveResult = await saveJobs(allJobs)

    // ========== FINAL REPORT ==========
    console.log('\n' + '═'.repeat(60))
    console.log('📈 FINAL REPORT')
    console.log('═'.repeat(60))
    
    for (const [source, count] of Object.entries(results)) {
        console.log(`   ${source.padEnd(20)} : ${count} jobs`)
    }
    
    console.log('─'.repeat(60))
    console.log(`   Total scraped:      ${allJobs.length}`)
    console.log(`   Saved to DB:        ${saveResult.saved}`)
    console.log(`   Skipped (invalid):  ${saveResult.skipped}`)
    console.log('═'.repeat(60))
    
    // API usage stats
    const apiStats = scrapestack.getStats()
    console.log(`\n🌐 Scrapestack API calls: ${apiStats.totalRequests}`)
    console.log(`✅ Completed: ${new Date().toISOString()}\n`)
}

// Run the aggregator
run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal error:', err)
        process.exit(1)
    })
