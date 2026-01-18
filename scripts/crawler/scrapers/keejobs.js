/**
 * Keejobs.com Scraper
 * Tunisian job board
 */

import * as cheerio from 'cheerio'
import scrapestack from '../scrapestack-client.js'
import CONFIG from '../config.js'

const SITE_NAME = 'keejobs'
const BASE_URL = 'https://www.keejob.com'

/**
 * Build search URL for Keejobs
 */
function buildSearchUrl(keyword = '', page = 1) {
    if (keyword) {
        return `${BASE_URL}/recherche-emploi?q=${encodeURIComponent(keyword)}&page=${page}`
    }
    return `${BASE_URL}/offres-emploi?page=${page}`
}

/**
 * Parse job listings from Keejobs HTML
 */
function parseJobListings(html) {
    const $ = cheerio.load(html)
    const jobs = []

    // Keejobs job cards
    $('div.job-item, div.offre-item, .job-listing, article.job, .offre-emploi').each((_, element) => {
        try {
            const $card = $(element)

            // Extract job link
            let jobLink = $card.find('a[href*="/offre-emploi/"], a[href*="/job/"], a.job-link, h2 a, .title a')
                .first()
                .attr('href')

            if (!jobLink) return

            // Make absolute URL
            if (jobLink.startsWith('/')) {
                jobLink = `${BASE_URL}${jobLink}`
            }

            // Extract title
            const title = $card.find('h2, h3, .job-title, .offre-title, .title')
                .first()
                .text()
                .trim()

            // Extract company
            const company = $card.find('.company, .entreprise, .employer-name, .societe')
                .first()
                .text()
                .trim() || 'Entreprise'

            // Extract location
            const location = $card.find('.location, .lieu, .ville, .region')
                .first()
                .text()
                .trim() || 'Tunisie'

            // Extract date
            const dateText = $card.find('.date, .published-date, time, .date-publication')
                .first()
                .text()
                .trim()

            // Extract contract type
            const contractType = $card.find('.contrat, .type-contrat, .contract')
                .first()
                .text()
                .trim() || 'CDI'

            if (title && jobLink) {
                jobs.push({
                    source_website: 'Keejobs',
                    original_url: jobLink,
                    title: title,
                    company_name: company,
                    location: location.includes('Tunis') ? location : `${location}, Tunisie`,
                    posted_at: parseDate(dateText),
                    job_type: contractType,
                    description: `Offre d'emploi sur Keejobs`,
                    tags: ['tunisia', 'keejobs']
                })
            }
        } catch (err) {
            console.error('Error parsing Keejobs card:', err.message)
        }
    })

    return jobs
}

/**
 * Parse date strings
 */
function parseDate(dateText) {
    if (!dateText) return new Date().toISOString()
    
    const now = new Date()
    const lower = dateText.toLowerCase()
    
    // French relative dates
    if (lower.includes('aujourd') || lower.includes('today')) {
        return now.toISOString()
    }
    if (lower.includes('hier') || lower.includes('yesterday')) {
        now.setDate(now.getDate() - 1)
        return now.toISOString()
    }
    
    // Try to parse absolute date (DD/MM/YYYY format common in Tunisia)
    const dateMatch = lower.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
    if (dateMatch) {
        const [, day, month, year] = dateMatch
        const fullYear = year.length === 2 ? `20${year}` : year
        return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString()
    }
    
    // Days ago
    const daysMatch = lower.match(/(\d+)\s*(jour|day)/i)
    if (daysMatch) {
        now.setDate(now.getDate() - parseInt(daysMatch[1]))
        return now.toISOString()
    }
    
    return now.toISOString()
}

/**
 * Main scrape function for Keejobs
 */
export async function scrapeKeejobs(keywords = [''], maxPages = 3) {
    console.log('\n🇹🇳 Starting Keejobs scraper...')
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
                    console.error(`❌ Keejobs failed for "${keyword}" page ${page}: ${result.error}`)
                    break
                }

                const jobs = parseJobListings(result.html)
                console.log(`   Found ${jobs.length} jobs for "${keyword || 'all'}" page ${page}`)

                if (jobs.length === 0) break

                for (const job of jobs) {
                    if (!seenUrls.has(job.original_url)) {
                        seenUrls.add(job.original_url)
                        allJobs.push(job)
                    }
                }

            } catch (error) {
                console.error(`❌ Keejobs error:`, error.message)
            }
        }
    }

    console.log(`✅ Keejobs: Total ${allJobs.length} unique jobs found`)
    return allJobs
}

export default { scrapeKeejobs }
