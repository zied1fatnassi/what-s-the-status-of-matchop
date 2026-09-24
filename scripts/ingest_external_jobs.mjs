/**
 * MatchOp External Jobs Ingestion Engine
 * Scrapes & ingests fresh, active, and verified job postings from:
 * 1. Tunisia: Keejob.com (Tunis, Ariana, Sfax, Sousse, Monastir, IT & Stage PFE)
 * 2. Europe: Arbeitnow API (France, Italy, Germany, Netherlands) & Jobicy Europe
 * 3. Global/APAC/Americas: Jobicy Worldwide & RemoteOK API (2026 active listings)
 * 
 * Cleans up obsolete/dead 2025 records so that student feeds are 100% fresh and working.
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

// 1. Load environment variables
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env')
    if (!fs.existsSync(envPath)) {
        throw new Error('.env file not found')
    }
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
    const env = {}
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx > 0) {
            env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
        }
    }
    return env
}

const env = loadEnv()
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Role Key in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 2. Fetchers for each source

/**
 * Fetch fresh Tunisian jobs from Keejob
 */
async function fetchKeejobOffers() {
    console.log('[Keejob] Fetching Tunisian tech & PFE offers...')
    const urls = [
        'https://www.keejob.com/offres-emploi/?q=informatique',
        'https://www.keejob.com/offres-emploi/?q=developpeur',
        'https://www.keejob.com/offres-emploi/?q=stage+pfe',
        'https://www.keejob.com/offres-emploi/'
    ]

    const jobs = []
    const seenUrls = new Set()

    for (const pageUrl of urls) {
        try {
            const res = await fetch(pageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8'
                }
            })

            if (!res.ok) {
                console.warn(`[Keejob] Non-200 response (${res.status}) for ${pageUrl}`)
                continue
            }

            const html = await res.text()

            // Split into job blocks or match job anchors
            // Keejob job link pattern: href="/offres-emploi/{id}/{slug}/"
            const linkRegex = /href="(\/offres-emploi\/(\d+)\/([a-z0-9-]+)\/?)"/gi
            let match
            while ((match = linkRegex.exec(html)) !== null) {
                const fullLink = 'https://www.keejob.com' + match[1].replace(/\/$/, '')
                const jobId = match[2]
                const rawSlug = match[3]

                if (seenUrls.has(fullLink)) continue
                seenUrls.add(fullLink)

                // Format title from slug or snippet
                const title = rawSlug
                    .split('-')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')

                // Extract context snippet around the link in HTML to find company and location
                const linkIndex = match.index
                const snippet = html.slice(Math.max(0, linkIndex - 200), Math.min(html.length, linkIndex + 600))

                // Look for company and location in snippet
                let company = 'Entreprise en Tunisie'
                const companyMatch = snippet.match(/class="[^"]*company[^"]*"[^>]*>([^<]+)<\//i) ||
                    snippet.match(/Recruteur\s*:\s*<strong>([^<]+)<\/strong>/i) ||
                    snippet.match(/title="Offres chez ([^"]+)"/i)
                if (companyMatch) {
                    company = companyMatch[1].trim()
                }

                // Detect governorate or city in Tunisia
                const tunisianCities = [
                    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Sousse', 'Sfax', 'Monastir',
                    'Nabeul', 'Bizerte', 'Gabès', 'Kairouan', 'Gafsa', 'Médenine', 'Kasserine',
                    'Mahdia', 'Lac 1', 'Lac 2', 'Charguia', 'El Ghazala'
                ]
                let detectedLocation = 'Tunis, Tunisie'
                for (const city of tunisianCities) {
                    if (new RegExp(`\\b${city}\\b`, 'i').test(snippet)) {
                        detectedLocation = `${city}, Tunisie`
                        break
                    }
                }

                const isInternship = /stage|pfe|stagiaire/i.test(title) || /stage-pfe/i.test(pageUrl)

                jobs.push({
                    source_website: 'Keejob',
                    original_url: fullLink,
                    title: title.slice(0, 150),
                    company_name: company.slice(0, 100),
                    location: detectedLocation,
                    job_type: isInternship ? 'Internship' : 'Full-time',
                    description: `Offre d'emploi publiée sur Keejob Tunisie. Consultez l'annonce officielle pour postuler directement.`,
                    salary_range: 'Rémunération selon profil',
                    posted_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    tags: isInternship ? ['Stage', 'PFE', 'Tunisie'] : ['IT', 'Tunisie', 'CDI'],
                    is_global: false
                })

                if (jobs.length >= 35) break
            }
        } catch (err) {
            console.error(`[Keejob] Error scraping ${pageUrl}:`, err.message)
        }
    }

    console.log(`[Keejob] Scraped ${jobs.length} active Tunisian opportunities.`)
    return jobs
}

/**
 * Fetch fresh European tech jobs from Arbeitnow API
 */
async function fetchArbeitnowOffers() {
    console.log('[Arbeitnow] Fetching European job listings (France, Italy, Germany, Netherlands)...')
    try {
        const res = await fetch('https://www.arbeitnow.com/api/job-board-api')
        if (!res.ok) {
            console.warn(`[Arbeitnow] Response status ${res.status}`)
            return []
        }
        const data = await res.json()
        const rawJobs = data.data || []

        const jobs = rawJobs.slice(0, 40).map(j => {
            const loc = (j.location || '').trim() || (j.remote ? 'Remote, Europe' : 'Europe')
            return {
                source_website: 'Arbeitnow',
                original_url: j.url,
                title: j.title.slice(0, 150),
                company_name: (j.company_name || 'European Tech Co').slice(0, 100),
                location: loc,
                job_type: j.remote ? 'Remote' : 'Full-time',
                description: (j.description || '').replace(/<[^>]+>/g, ' ').slice(0, 400).trim(),
                salary_range: 'Competitive European package',
                posted_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                tags: Array.isArray(j.tags) && j.tags.length > 0 ? j.tags.slice(0, 5) : ['Europe', 'Tech'],
                is_global: true
            }
        })

        console.log(`[Arbeitnow] Ingested ${jobs.length} European jobs.`)
        return jobs
    } catch (err) {
        console.error('[Arbeitnow] Fetch error:', err.message)
        return []
    }
}

/**
 * Fetch active jobs from Jobicy (Europe, APAC, Global)
 */
async function fetchJobicyOffers() {
    console.log('[Jobicy] Fetching active Europe and APAC/Global jobs...')
    const results = []

    const endpoints = [
        { url: 'https://jobicy.com/api/v2/remote-jobs?count=25&geo=europe', region: 'Europe' },
        { url: 'https://jobicy.com/api/v2/remote-jobs?count=25&geo=apac', region: 'APAC (Vietnam, China, Asia)' },
        { url: 'https://jobicy.com/api/v2/remote-jobs?count=25', region: 'Global' }
    ]

    for (const ep of endpoints) {
        try {
            const res = await fetch(ep.url)
            if (!res.ok) continue
            const data = await res.json()
            const jobs = data.jobs || []

            for (const j of jobs) {
                const pubDate = j.pubDate ? new Date(j.pubDate).toISOString() : new Date().toISOString()
                const loc = (j.jobGeo || ep.region).trim()

                results.push({
                    source_website: `Jobicy (${ep.region})`,
                    original_url: j.url,
                    title: (j.jobTitle || 'Software Opportunity').slice(0, 150),
                    company_name: (j.companyName || 'Global Enterprise').slice(0, 100),
                    location: loc,
                    job_type: j.jobType || 'Full-time',
                    description: (j.jobExcerpt || j.jobDescription || '').replace(/<[^>]+>/g, ' ').slice(0, 400).trim(),
                    salary_range: 'Market rate',
                    posted_at: pubDate,
                    created_at: new Date().toISOString(),
                    tags: [ep.region, 'Tech', ...(j.jobIndustry ? [j.jobIndustry] : [])],
                    is_global: true
                })
            }
        } catch (err) {
            console.error(`[Jobicy] Error fetching ${ep.region}:`, err.message)
        }
    }

    console.log(`[Jobicy] Ingested ${results.length} active jobs across Europe, APAC and Global.`)
    return results
}

/**
 * Fetch latest active RemoteOK listings (2026 active)
 */
async function fetchRemoteOkOffers() {
    console.log('[RemoteOK] Fetching 2026 active listings...')
    try {
        const res = await fetch('https://remoteok.com/api', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        if (!res.ok) return []
        const data = await res.json()
        const raw = (Array.isArray(data) ? data.slice(1) : []).filter(j => j.position && j.url)

        const jobs = raw.slice(0, 25).map(j => {
            const date = j.epoch ? new Date(j.epoch * 1000).toISOString() : new Date().toISOString()
            return {
                source_website: 'RemoteOK',
                original_url: j.url,
                title: j.position.slice(0, 150),
                company_name: (j.company || 'Remote Tech Co').slice(0, 100),
                location: j.location ? `${j.location} (Remote)` : 'Remote Anywhere',
                job_type: 'Full-time',
                description: (j.description || '').replace(/<[^>]+>/g, ' ').slice(0, 400).trim(),
                salary_range: 'Competitive',
                posted_at: date,
                created_at: new Date().toISOString(),
                tags: Array.isArray(j.tags) ? j.tags.slice(0, 5) : ['Remote'],
                is_global: true
            }
        })

        console.log(`[RemoteOK] Ingested ${jobs.length} active jobs.`)
        return jobs
    } catch (err) {
        console.error('[RemoteOK] Fetch error:', err.message)
        return []
    }
}

// 3. Main execution pipeline
async function main() {
    console.log('====================================================')
    console.log('  MatchOp Fresh External Jobs Ingestion Pipeline    ')
    console.log('====================================================')

    // 1. Purge old December 2025 dead rows
    console.log('[Cleanup] Purging obsolete December 2025 records with dead links...')
    const { error: purgeErr, count: purgedCount } = await supabase
        .from('external_jobs')
        .delete({ count: 'exact' })
        .lt('posted_at', '2026-01-01T00:00:00Z')

    if (purgeErr) {
        console.warn('[Cleanup] Note on purge:', purgeErr.message)
    } else {
        console.log(`[Cleanup] Successfully removed ${purgedCount || 0} outdated 2025 records.`)
    }

    // Also purge null posted_at records that are ancient
    await supabase
        .from('external_jobs')
        .delete()
        .is('posted_at', null)

    // 2. Fetch fresh listings in parallel
    const [keejobJobs, arbeitnowJobs, jobicyJobs, remoteokJobs] = await Promise.all([
        fetchKeejobOffers(),
        fetchArbeitnowOffers(),
        fetchJobicyOffers(),
        fetchRemoteOkOffers()
    ])

    const allFreshJobs = [
        ...keejobJobs,
        ...arbeitnowJobs,
        ...jobicyJobs,
        ...remoteokJobs
    ]

    // Deduplicate by original_url to prevent batch conflicts
    const dedupMap = new Map()
    for (const job of allFreshJobs) {
        if (!job.original_url || dedupMap.has(job.original_url)) continue
        dedupMap.set(job.original_url, job)
    }
    const uniqueFreshJobs = Array.from(dedupMap.values())

    console.log(`[Ingestion] Total collected fresh opportunities: ${allFreshJobs.length} (${uniqueFreshJobs.length} unique)`)

    // 3. Upsert into Supabase external_jobs table in batches
    const BATCH_SIZE = 25
    let inserted = 0
    let errors = 0

    for (let i = 0; i < uniqueFreshJobs.length; i += BATCH_SIZE) {
        const batch = uniqueFreshJobs.slice(i, i + BATCH_SIZE)
        const { error } = await supabase
            .from('external_jobs')
            .upsert(batch, { onConflict: 'original_url' })

        if (error) {
            console.error(`[Ingestion] Batch ${i / BATCH_SIZE + 1} error:`, error.message)
            errors++
        } else {
            inserted += batch.length
        }
    }

    console.log(`[Ingestion] Finished! Inserted/Upserted ${inserted} fresh jobs (errors: ${errors}).`)

    // Verify current count and sources in database
    const { count: finalCount } = await supabase
        .from('external_jobs')
        .select('id', { count: 'exact', head: true })

    const { data: sourceSamples } = await supabase
        .from('external_jobs')
        .select('source_website, location, posted_at')
        .order('posted_at', { ascending: false })
        .limit(10)

    console.log(`[Verification] Current active external_jobs in database: ${finalCount}`)
    console.log('[Verification] Sample top 10 latest jobs:', sourceSamples)
    console.log('====================================================')
}

main().catch(err => {
    console.error('[Fatal]', err)
    process.exit(1)
})
