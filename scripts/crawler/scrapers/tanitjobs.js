/**
 * TanitJobs.com Scraper
 * Tunisia's leading job board
 */

import * as cheerio from 'cheerio'
import scrapestack from '../scrapestack-client.js'
import CONFIG from '../config.js'

const SITE_NAME = 'tanitjobs'
const BASE_URL = 'https://www.tanitjobs.com'

/**
 * Build search URL for TanitJobs
 */
function buildSearchUrl(keyword = '', page = 1) {
    if (keyword) {
        return `${BASE_URL}/recherche?q=${encodeURIComponent(keyword)}&page=${page}`
    }
    return `${BASE_URL}/offres-emploi?page=${page}`
}

/**
 * Parse job listings from TanitJobs HTML
 */
function parseJobListings(html) {
    const $ = cheerio.load(html)
    const jobs = []

    // TanitJobs job cards - multiple possible selectors
    $('div.job-item, div.offer-item, article.job-listing, div.job-card, .jobs-list .item').each((_, element) => {
        try {
            const $card = $(element)

            // Extract job link
            let jobLink = $card.find('a[href*="/offre/"], a[href*="/job/"], a.job-title-link, h2 a, h3 a')
                .first()
                .attr('href')

            if (!jobLink) return

            // Make absolute URL
            if (jobLink.startsWith('/')) {
                jobLink = `${BASE_URL}${jobLink}`
            }

            // Extract title
            const title = $card.find('h2, h3, .job-title, .offer-title, a.job-title-link')
                .first()
                .text()
                .trim()

            // Extract company
            const company = $card.find('.company-name, .employer, .company, span.company')
                .first()
                .text()
                .trim() || 'Voir annonce'

            // Extract location
            const location = $card.find('.location, .job-location, .city, span.location')
                .first()
                .text()
                .trim() || 'Tunisie'

            // Extract date
            const dateText = $card.find('.date, .posted-date, time, .job-date')
                .first()
                .text()
                .trim()

            // Extract job type
            const jobType = $card.find('.job-type, .contract-type, .type')
                .first()
                .text()
                .trim() || 'CDI'

            if (title && jobLink) {
                jobs.push({
                    source_website: 'TanitJobs',
                    original_url: jobLink,
                    title: title,
                    company_name: company,
                    location: location.includes('Tunis') ? location : `${location}, Tunisie`,
                    posted_at: parseRelativeDate(dateText),
                    job_type: jobType,
                    description: `Offre d'emploi sur TanitJobs`,
                    tags: ['tunisia', 'tanitjobs']
                })
            }
        } catch (err) {
            console.error('Error parsing TanitJobs card:', err.message)
        }
    })

    return jobs
}

/**
 * Parse relative date strings (French)
 */
function parseRelativeDate(dateText) {
    if (!dateText) return new Date().toISOString()
    
    const now = new Date()
    const lower = dateText.toLowerCase()
    
    if (lower.includes('aujourd') || lower.includes('today')) {
        return now.toISOString()
    }
    if (lower.includes('hier') || lower.includes('yesterday')) {
        now.setDate(now.getDate() - 1)
        return now.toISOString()
    }
    
    const daysMatch = lower.match(/(\d+)\s*(jour|day)/i)
    if (daysMatch) {
        now.setDate(now.getDate() - parseInt(daysMatch[1]))
        return now.toISOString()
    }
    
    const weeksMatch = lower.match(/(\d+)\s*(semaine|week)/i)
    if (weeksMatch) {
        now.setDate(now.getDate() - parseInt(weeksMatch[1]) * 7)
        return now.toISOString()
    }
    
    return now.toISOString()
}

/**
 * Main scrape function for TanitJobs
 */
export async function scrapeTanitJobs(keywords = [''], maxPages = 3) {
    console.log('\n🇹🇳 Starting TanitJobs scraper...')
    const allJobs = []
    const seenUrls = new Set()

    for (const keyword of keywords) {
        for (let page = 1; page <= maxPages; page++) {
            try {
                const searchUrl = buildSearchUrl(keyword, page)
                
                const result = await scrapestack.fetch(searchUrl, {
                    siteName: SITE_NAME,
                    proxyLocation: CONFIG.PROXY_LOCATIONS.tunisia,
                    renderJs: true
                })

                if (!result.success) {
                    console.error(`❌ TanitJobs failed for "${keyword}" page ${page}: ${result.error}`)
                    break // Move to next keyword
                }

                const jobs = parseJobListings(result.html)
                console.log(`   Found ${jobs.length} jobs for "${keyword || 'all'}" page ${page}`)

                if (jobs.length === 0) break // No more results

                // Deduplicate
                for (const job of jobs) {
                    if (!seenUrls.has(job.original_url)) {
                        seenUrls.add(job.original_url)
                        allJobs.push(job)
                    }
                }

            } catch (error) {
                console.error(`❌ TanitJobs error:`, error.message)
            }
        }
    }

    console.log(`✅ TanitJobs: Total ${allJobs.length} unique jobs found`)
    return allJobs
}

export default { scrapeTanitJobs }
