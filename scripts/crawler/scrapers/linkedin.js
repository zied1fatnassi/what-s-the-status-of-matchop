/**
 * LinkedIn Job Scraper
 * Scrapes public job search results (no authentication required)
 */

import * as cheerio from 'cheerio'
import scrapestack from '../scrapestack-client.js'
import CONFIG from '../config.js'

const SITE_NAME = 'linkedin'

/**
 * Build LinkedIn search URL
 */
function buildSearchUrl(keyword, location = '', start = 0) {
    const params = new URLSearchParams({
        keywords: keyword,
        location: location,
        f_TPR: 'r604800', // Last 7 days
        position: '1',
        pageNum: '0',
        start: start.toString()
    })
    
    return `https://www.linkedin.com/jobs/search?${params.toString()}`
}

/**
 * Parse job listings from search results HTML
 */
function parseSearchResults(html) {
    const $ = cheerio.load(html)
    const jobs = []

    // LinkedIn public job cards
    $('div.base-card, div.job-search-card, li.jobs-search-results__list-item').each((_, element) => {
        try {
            const $card = $(element)
            
            // Extract job link - try multiple selectors
            let jobLink = $card.find('a.base-card__full-link').attr('href') ||
                         $card.find('a[data-tracking-control-name="public_jobs_jserp-result_search-card"]').attr('href') ||
                         $card.find('a.job-search-card__link-wrapper').attr('href')
            
            if (!jobLink) return

            // Clean the URL (remove tracking params)
            jobLink = cleanLinkedInUrl(jobLink)
            if (!jobLink) return

            // Extract title
            const title = $card.find('h3.base-search-card__title, span.sr-only, h3.job-search-card__title')
                .first()
                .text()
                .trim()

            // Extract company
            const company = $card.find('h4.base-search-card__subtitle a, a.job-search-card__subtitle-link')
                .first()
                .text()
                .trim() || 'Company on LinkedIn'

            // Extract location
            const location = $card.find('span.job-search-card__location, span.base-search-card__metadata')
                .first()
                .text()
                .trim()

            // Extract posted date
            const postedText = $card.find('time.job-search-card__listdate, time')
                .attr('datetime') || new Date().toISOString()

            if (title && jobLink) {
                jobs.push({
                    source_website: 'LinkedIn',
                    original_url: jobLink,
                    title: title,
                    company_name: company,
                    location: location || 'See listing',
                    posted_at: postedText,
                    job_type: 'Full-time',
                    description: `View full job details on LinkedIn`,
                    tags: ['linkedin']
                })
            }
        } catch (err) {
            console.error('Error parsing LinkedIn card:', err.message)
        }
    })

    return jobs
}

/**
 * Clean LinkedIn URL to get direct job link
 */
function cleanLinkedInUrl(url) {
    if (!url) return null
    
    try {
        // Handle relative URLs
        if (url.startsWith('/')) {
            url = `https://www.linkedin.com${url}`
        }
        
        const parsed = new URL(url)
        
        // Extract job ID and build clean URL
        const jobIdMatch = url.match(/jobs\/view\/(\d+)/) || 
                          url.match(/currentJobId=(\d+)/) ||
                          url.match(/\/(\d+)\/?(?:\?|$)/)
        
        if (jobIdMatch) {
            return `https://www.linkedin.com/jobs/view/${jobIdMatch[1]}`
        }
        
        // Return cleaned URL without tracking params
        parsed.search = ''
        return parsed.toString()
        
    } catch {
        return null
    }
}

/**
 * Main scrape function for LinkedIn
 */
export async function scrapeLinkedIn(keywords = CONFIG.SEARCH_KEYWORDS, locations = ['']) {
    console.log('\n🔷 Starting LinkedIn scraper...')
    const allJobs = []
    const seenUrls = new Set()

    for (const keyword of keywords.slice(0, 5)) { // Limit keywords to save API calls
        for (const location of locations.slice(0, 2)) {
            try {
                const searchUrl = buildSearchUrl(keyword, location)
                
                const result = await scrapestack.fetch(searchUrl, {
                    siteName: SITE_NAME,
                    proxyLocation: CONFIG.PROXY_LOCATIONS.global,
                    renderJs: true
                })

                if (!result.success) {
                    console.error(`❌ LinkedIn search failed for "${keyword}": ${result.error}`)
                    continue
                }

                const jobs = parseSearchResults(result.html)
                console.log(`   Found ${jobs.length} jobs for "${keyword}" in "${location || 'any location'}"`)

                // Deduplicate
                for (const job of jobs) {
                    if (!seenUrls.has(job.original_url)) {
                        seenUrls.add(job.original_url)
                        allJobs.push(job)
                    }
                }

            } catch (error) {
                console.error(`❌ LinkedIn error for "${keyword}":`, error.message)
            }
        }
    }

    console.log(`✅ LinkedIn: Total ${allJobs.length} unique jobs found`)
    return allJobs
}

export default { scrapeLinkedIn }
