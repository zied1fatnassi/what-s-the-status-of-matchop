/**
 * Bayt.com Scraper
 * Leading MENA region job board
 */

import * as cheerio from 'cheerio'
import scrapestack from '../scrapestack-client.js'
import CONFIG from '../config.js'

const SITE_NAME = 'bayt'
const BASE_URL = 'https://www.bayt.com'

/**
 * Build search URL for Bayt
 */
function buildSearchUrl(keyword = '', location = '', page = 1) {
    const params = new URLSearchParams()
    if (keyword) {
        params.append('keyword', keyword)
    }
    if (location) {
        params.append('location', location)
    }
    params.append('page', page.toString())
    
    return `${BASE_URL}/en/jobs/?${params.toString()}`
}

/**
 * Parse job listings from Bayt HTML
 */
function parseJobListings(html) {
    const $ = cheerio.load(html)
    const jobs = []

    // Bayt job cards
    $('li[data-js-job], div.job-card, .jb-card, li.has-pointer-d').each((_, element) => {
        try {
            const $card = $(element)

            // Extract job link
            let jobLink = $card.find('a[href*="/en/job/"], a.jb-title, h2 a')
                .first()
                .attr('href')

            if (!jobLink) return

            // Make absolute URL
            if (jobLink.startsWith('/')) {
                jobLink = `${BASE_URL}${jobLink}`
            }

            // Clean URL
            try {
                const urlObj = new URL(jobLink)
                urlObj.search = '' // Remove query params
                jobLink = urlObj.toString()
            } catch {}

            // Extract title
            const title = $card.find('h2 a, a.jb-title, .job-title, [data-js-job-title]')
                .first()
                .text()
                .trim()

            // Extract company
            const company = $card.find('.jb-company, .company-name, [data-js-company-name], a[href*="/company/"]')
                .first()
                .text()
                .trim() || 'Company on Bayt'

            // Extract location
            const location = $card.find('.jb-loc, .job-location, [data-js-job-location]')
                .first()
                .text()
                .trim() || 'MENA Region'

            // Extract date
            const dateText = $card.find('.jb-date, .posted-date, time')
                .first()
                .text()
                .trim()

            // Extract experience level
            const experience = $card.find('.jb-exp, .experience, [data-js-experience]')
                .first()
                .text()
                .trim()

            if (title && jobLink) {
                jobs.push({
                    source_website: 'Bayt',
                    original_url: jobLink,
                    title: title,
                    company_name: company,
                    location: cleanLocation(location),
                    posted_at: parseBaytDate(dateText),
                    job_type: 'Full-time',
                    description: experience ? `Experience: ${experience}` : 'View job details on Bayt.com',
                    tags: ['mena', 'bayt', 'gulf']
                })
            }
        } catch (err) {
            console.error('Error parsing Bayt card:', err.message)
        }
    })

    return jobs
}

/**
 * Clean location string
 */
function cleanLocation(location) {
    if (!location) return 'MENA Region'
    
    // Remove extra whitespace and normalize
    return location
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/,\s*,/g, ',')
}

/**
 * Parse Bayt date format
 */
function parseBaytDate(dateText) {
    if (!dateText) return new Date().toISOString()
    
    const now = new Date()
    const lower = dateText.toLowerCase()
    
    if (lower.includes('today') || lower.includes('new')) {
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
    
    // "X hours ago"
    const hoursMatch = lower.match(/(\d+)\s*hour/i)
    if (hoursMatch) {
        now.setHours(now.getHours() - parseInt(hoursMatch[1]))
        return now.toISOString()
    }
    
    return now.toISOString()
}

/**
 * Main scrape function for Bayt
 */
export async function scrapeBayt(keywords = ['software', 'developer', 'engineer'], locations = [''], maxPages = 2) {
    console.log('\n🌍 Starting Bayt.com scraper...')
    const allJobs = []
    const seenUrls = new Set()

    for (const keyword of keywords) {
        for (const location of locations) {
            for (let page = 1; page <= maxPages; page++) {
                try {
                    const searchUrl = buildSearchUrl(keyword, location, page)
                    
                    const result = await scrapestack.fetch(searchUrl, {
                        siteName: SITE_NAME,
                        proxyLocation: CONFIG.PROXY_LOCATIONS.uae,
                        renderJs: true
                    })

                    if (!result.success) {
                        console.error(`❌ Bayt failed for "${keyword}" page ${page}: ${result.error}`)
                        break
                    }

                    const jobs = parseJobListings(result.html)
                    console.log(`   Found ${jobs.length} jobs for "${keyword}" page ${page}`)

                    if (jobs.length === 0) break

                    for (const job of jobs) {
                        if (!seenUrls.has(job.original_url)) {
                            seenUrls.add(job.original_url)
                            allJobs.push(job)
                        }
                    }

                } catch (error) {
                    console.error(`❌ Bayt error:`, error.message)
                }
            }
        }
    }

    console.log(`✅ Bayt: Total ${allJobs.length} unique jobs found`)
    return allJobs
}

export default { scrapeBayt }
