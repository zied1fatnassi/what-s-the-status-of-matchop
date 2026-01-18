/**
 * Wuzzuf.net Scraper
 * Egypt & MENA region job board
 */

import * as cheerio from 'cheerio'
import scrapestack from '../scrapestack-client.js'
import CONFIG from '../config.js'

const SITE_NAME = 'wuzzuf'
const BASE_URL = 'https://wuzzuf.net'

/**
 * Build search URL for Wuzzuf
 */
function buildSearchUrl(keyword = '', page = 0) {
    const params = new URLSearchParams()
    if (keyword) {
        params.append('q', keyword)
    }
    params.append('start', (page * 15).toString())
    
    return `${BASE_URL}/search/jobs?${params.toString()}`
}

/**
 * Parse job listings from Wuzzuf HTML
 */
function parseJobListings(html) {
    const $ = cheerio.load(html)
    const jobs = []

    // Wuzzuf job cards
    $('div.css-1gatmva, div.css-pkv5jc, div[data-testid="job-card"], .job-card').each((_, element) => {
        try {
            const $card = $(element)

            // Extract job link
            let jobLink = $card.find('a[href*="/jobs/"], a.css-o171kl, h2 a')
                .first()
                .attr('href')

            if (!jobLink) return

            // Make absolute URL
            if (jobLink.startsWith('/')) {
                jobLink = `${BASE_URL}${jobLink}`
            }

            // Extract title
            const title = $card.find('h2 a, a.css-o171kl, .job-title')
                .first()
                .text()
                .trim()

            // Extract company
            const company = $card.find('a.css-17s97q8, .company-name, a[href*="/companies/"]')
                .first()
                .text()
                .trim() || 'Company'

            // Extract location
            const location = $card.find('span.css-5wys0k, .job-location, span[class*="location"]')
                .first()
                .text()
                .trim() || 'Egypt'

            // Extract job type & experience
            const metadata = $card.find('div.css-1lh1skq span, .job-meta span')
                .map((_, el) => $(el).text().trim())
                .get()
                .join(' | ')

            // Extract date
            const dateText = $card.find('time, .posted-date, span[class*="date"]')
                .first()
                .text()
                .trim()

            if (title && jobLink) {
                jobs.push({
                    source_website: 'Wuzzuf',
                    original_url: jobLink,
                    title: title,
                    company_name: company,
                    location: location,
                    posted_at: parseWuzzufDate(dateText),
                    job_type: extractJobType(metadata),
                    description: metadata || 'View job details on Wuzzuf',
                    tags: ['egypt', 'mena', 'wuzzuf']
                })
            }
        } catch (err) {
            console.error('Error parsing Wuzzuf card:', err.message)
        }
    })

    return jobs
}

/**
 * Extract job type from metadata
 */
function extractJobType(metadata) {
    const lower = metadata.toLowerCase()
    if (lower.includes('full time') || lower.includes('full-time')) return 'Full-time'
    if (lower.includes('part time') || lower.includes('part-time')) return 'Part-time'
    if (lower.includes('remote')) return 'Remote'
    if (lower.includes('freelance')) return 'Freelance'
    if (lower.includes('internship')) return 'Internship'
    return 'Full-time'
}

/**
 * Parse Wuzzuf date format
 */
function parseWuzzufDate(dateText) {
    if (!dateText) return new Date().toISOString()
    
    const now = new Date()
    const lower = dateText.toLowerCase()
    
    if (lower.includes('today') || lower.includes('just now')) {
        return now.toISOString()
    }
    if (lower.includes('yesterday')) {
        now.setDate(now.getDate() - 1)
        return now.toISOString()
    }
    
    // "X days ago"
    const daysMatch = lower.match(/(\d+)\s*day/i)
    if (daysMatch) {
        now.setDate(now.getDate() - parseInt(daysMatch[1]))
        return now.toISOString()
    }
    
    // "X weeks ago"
    const weeksMatch = lower.match(/(\d+)\s*week/i)
    if (weeksMatch) {
        now.setDate(now.getDate() - parseInt(weeksMatch[1]) * 7)
        return now.toISOString()
    }
    
    // "X months ago"
    const monthsMatch = lower.match(/(\d+)\s*month/i)
    if (monthsMatch) {
        now.setMonth(now.getMonth() - parseInt(monthsMatch[1]))
        return now.toISOString()
    }
    
    return now.toISOString()
}

/**
 * Main scrape function for Wuzzuf
 */
export async function scrapeWuzzuf(keywords = ['software', 'developer', 'engineer'], maxPages = 2) {
    console.log('\n🇪🇬 Starting Wuzzuf scraper...')
    const allJobs = []
    const seenUrls = new Set()

    for (const keyword of keywords) {
        for (let page = 0; page < maxPages; page++) {
            try {
                const searchUrl = buildSearchUrl(keyword, page)
                
                const result = await scrapestack.fetch(searchUrl, {
                    siteName: SITE_NAME,
                    proxyLocation: CONFIG.PROXY_LOCATIONS.egypt,
                    renderJs: true
                })

                if (!result.success) {
                    console.error(`❌ Wuzzuf failed for "${keyword}" page ${page}: ${result.error}`)
                    break
                }

                const jobs = parseJobListings(result.html)
                console.log(`   Found ${jobs.length} jobs for "${keyword}" page ${page + 1}`)

                if (jobs.length === 0) break

                for (const job of jobs) {
                    if (!seenUrls.has(job.original_url)) {
                        seenUrls.add(job.original_url)
                        allJobs.push(job)
                    }
                }

            } catch (error) {
                console.error(`❌ Wuzzuf error:`, error.message)
            }
        }
    }

    console.log(`✅ Wuzzuf: Total ${allJobs.length} unique jobs found`)
    return allJobs
}

export default { scrapeWuzzuf }
