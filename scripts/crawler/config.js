/**
 * Scraping Engine Configuration
 * MatchOp Job Aggregator v2.0
 */

export const CONFIG = {
    // Scrapestack API
    SCRAPESTACK_API_KEY: 'ce507b8e5e3d1d6990bdeea07e5b6404',
    SCRAPESTACK_BASE_URL: 'http://api.scrapestack.com/scrape',
    
    // Request Settings
    REQUEST_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000,
    CONCURRENT_REQUESTS: 3,
    
    // Rate Limiting (requests per minute per site)
    RATE_LIMITS: {
        linkedin: 10,
        tanitjobs: 20,
        keejobs: 20,
        wuzzuf: 15,
        bayt: 15,
        default: 20
    },
    
    // Geo-targeting proxy locations
    PROXY_LOCATIONS: {
        tunisia: 'tn',
        uae: 'ae',
        egypt: 'eg',
        global: 'us'
    },
    
    // Search Keywords for each site
    SEARCH_KEYWORDS: [
        'software engineer',
        'developer',
        'frontend',
        'backend',
        'fullstack',
        'devops',
        'data scientist',
        'product manager',
        'designer',
        'marketing',
        'remote'
    ],
    
    // Location filters
    LOCATIONS: [
        'Tunisia',
        'Tunis',
        'Remote',
        'Dubai',
        'Cairo',
        'MENA'
    ]
}

export default CONFIG
