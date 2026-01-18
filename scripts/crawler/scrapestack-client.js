/**
 * Scrapestack API Client
 * Handles all HTTP requests through Scrapestack proxy with JS rendering
 */

import axios from 'axios'
import CONFIG from './config.js'

class ScrapestackClient {
    constructor() {
        this.apiKey = CONFIG.SCRAPESTACK_API_KEY
        this.baseUrl = CONFIG.SCRAPESTACK_BASE_URL
        this.requestCount = 0
        this.lastRequestTime = {}
    }

    /**
     * Build Scrapestack API URL with parameters
     */
    buildUrl(targetUrl, options = {}) {
        const params = new URLSearchParams({
            access_key: this.apiKey,
            url: targetUrl,
            render_js: options.renderJs !== false ? '1' : '0'
        })

        // Add proxy location for geo-targeting
        if (options.proxyLocation) {
            params.append('proxy_location', options.proxyLocation)
        }

        // Add custom headers if needed
        if (options.keepHeaders) {
            params.append('keep_headers', '1')
        }

        return `${this.baseUrl}?${params.toString()}`
    }

    /**
     * Rate limiter - ensures we don't exceed limits per site
     */
    async rateLimitWait(siteName) {
        const limit = CONFIG.RATE_LIMITS[siteName] || CONFIG.RATE_LIMITS.default
        const minInterval = 60000 / limit // ms between requests

        const lastRequest = this.lastRequestTime[siteName] || 0
        const timeSince = Date.now() - lastRequest
        
        if (timeSince < minInterval) {
            const waitTime = minInterval - timeSince
            console.log(`⏳ Rate limit: waiting ${Math.round(waitTime)}ms for ${siteName}`)
            await this.sleep(waitTime)
        }

        this.lastRequestTime[siteName] = Date.now()
    }

    /**
     * Fetch a page through Scrapestack
     */
    async fetch(targetUrl, options = {}) {
        const siteName = options.siteName || 'default'
        await this.rateLimitWait(siteName)

        const scrapestackUrl = this.buildUrl(targetUrl, options)
        
        for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
            try {
                console.log(`🌐 [${siteName}] Fetching: ${targetUrl.substring(0, 80)}...`)
                
                const response = await axios.get(scrapestackUrl, {
                    timeout: CONFIG.REQUEST_TIMEOUT,
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5,fr;q=0.3,ar;q=0.2'
                    }
                })

                this.requestCount++
                
                // Check for Scrapestack errors in response
                if (response.data && typeof response.data === 'object' && response.data.error) {
                    throw new Error(`Scrapestack Error: ${response.data.error.info || response.data.error}`)
                }

                return {
                    success: true,
                    html: response.data,
                    status: response.status,
                    url: targetUrl
                }

            } catch (error) {
                console.error(`❌ [${siteName}] Attempt ${attempt}/${CONFIG.RETRY_ATTEMPTS} failed: ${error.message}`)
                
                if (attempt < CONFIG.RETRY_ATTEMPTS) {
                    await this.sleep(CONFIG.RETRY_DELAY * attempt)
                } else {
                    return {
                        success: false,
                        error: error.message,
                        url: targetUrl
                    }
                }
            }
        }
    }

    /**
     * Verify a job link is valid (returns HTTP 200)
     */
    async verifyLink(url, options = {}) {
        try {
            // Use Scrapestack to check the link (some sites block HEAD requests)
            const result = await this.fetch(url, {
                ...options,
                renderJs: false // Faster check without JS rendering
            })

            if (!result.success) {
                return { valid: false, reason: result.error }
            }

            // Check if we got redirected to an error page or login
            const html = result.html.toLowerCase()
            const errorIndicators = [
                'page not found',
                '404',
                'job expired',
                'no longer available',
                'this job has been removed',
                'login to view',
                'sign in required'
            ]

            for (const indicator of errorIndicators) {
                if (html.includes(indicator)) {
                    return { valid: false, reason: `Page contains: "${indicator}"` }
                }
            }

            return { valid: true, status: 200 }

        } catch (error) {
            return { valid: false, reason: error.message }
        }
    }

    /**
     * Get request statistics
     */
    getStats() {
        return {
            totalRequests: this.requestCount,
            timestamp: new Date().toISOString()
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

// Singleton instance
export const scrapestack = new ScrapestackClient()
export default scrapestack
