/**
 * Database Cleanup Script
 * Removes all corrupted/dead links from external_jobs table
 * 
 * Run: node scripts/crawler/cleanup-dead-links.js
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'
import scrapestack from './scrapestack-client.js'

// Load env vars
const envFile = fs.readFileSync('.env', 'utf8')
const envConfig = dotenv.parse(envFile)

const supabase = createClient(
    envConfig.VITE_SUPABASE_URL,
    envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY
)

const BATCH_SIZE = 50
const VERIFY_SAMPLE_SIZE = 20 // Only verify a sample to save API calls

async function cleanupDeadLinks() {
    console.log('🧹 Starting Database Cleanup...\n')
    
    const stats = {
        totalScanned: 0,
        deletedFakeLinks: 0,
        deletedDeadLinks: 0,
        verifiedAlive: 0,
        errors: 0
    }

    // ============================================
    // PHASE 1: Delete all example.com fake links
    // ============================================
    console.log('📌 Phase 1: Removing fake example.com links...')
    
    const { data: fakeLinks, error: fakeError } = await supabase
        .from('external_jobs')
        .select('id, original_url')
        .or('original_url.ilike.%example.com%,original_url.ilike.%placeholder%,original_url.ilike.%fake%')
    
    if (fakeError) {
        console.error('❌ Error fetching fake links:', fakeError.message)
    } else if (fakeLinks && fakeLinks.length > 0) {
        console.log(`   Found ${fakeLinks.length} fake links to delete`)
        
        const fakeIds = fakeLinks.map(j => j.id)
        
        // Delete in batches
        for (let i = 0; i < fakeIds.length; i += BATCH_SIZE) {
            const batch = fakeIds.slice(i, i + BATCH_SIZE)
            const { error: deleteError } = await supabase
                .from('external_jobs')
                .delete()
                .in('id', batch)
            
            if (deleteError) {
                console.error(`   ❌ Batch delete error:`, deleteError.message)
                stats.errors++
            } else {
                stats.deletedFakeLinks += batch.length
                console.log(`   ✅ Deleted batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} fake links`)
            }
        }
    } else {
        console.log('   ✅ No fake example.com links found')
    }

    // ============================================
    // PHASE 2: Delete jobs from non-priority sources
    // ============================================
    console.log('\n📌 Phase 2: Cleaning legacy/placeholder sources...')
    
    const legacySources = ['Partner Network', 'Global Aggregator', 'Legacy', 'Test']
    
    for (const source of legacySources) {
        const { data: legacyJobs, error: legacyError } = await supabase
            .from('external_jobs')
            .select('id')
            .ilike('source_website', `%${source}%`)
        
        if (legacyError) {
            console.error(`   ❌ Error checking ${source}:`, legacyError.message)
            continue
        }
        
        if (legacyJobs && legacyJobs.length > 0) {
            const ids = legacyJobs.map(j => j.id)
            const { error: delError } = await supabase
                .from('external_jobs')
                .delete()
                .in('id', ids)
            
            if (!delError) {
                stats.deletedFakeLinks += ids.length
                console.log(`   ✅ Deleted ${ids.length} jobs from "${source}"`)
            }
        }
    }

    // ============================================
    // PHASE 3: Verify sample of remaining links
    // ============================================
    console.log('\n📌 Phase 3: Verifying sample of remaining links...')
    
    const { data: remainingJobs, error: remainingError } = await supabase
        .from('external_jobs')
        .select('id, original_url, source_website')
        .order('created_at', { ascending: false })
        .limit(VERIFY_SAMPLE_SIZE)
    
    if (remainingError) {
        console.error('❌ Error fetching remaining jobs:', remainingError.message)
    } else if (remainingJobs && remainingJobs.length > 0) {
        console.log(`   Checking ${remainingJobs.length} recent links...`)
        
        const deadLinkIds = []
        
        for (const job of remainingJobs) {
            stats.totalScanned++
            
            // Skip obviously bad URLs
            if (!job.original_url || 
                !job.original_url.startsWith('http') ||
                job.original_url.includes('example.com')) {
                deadLinkIds.push(job.id)
                console.log(`   ❌ Invalid URL: ${job.original_url?.substring(0, 50)}...`)
                continue
            }
            
            // Verify link via Scrapestack
            const result = await scrapestack.verifyLink(job.original_url, {
                siteName: job.source_website?.toLowerCase() || 'default'
            })
            
            if (result.valid) {
                stats.verifiedAlive++
                console.log(`   ✅ Valid: ${job.original_url.substring(0, 60)}...`)
            } else {
                deadLinkIds.push(job.id)
                console.log(`   ❌ Dead: ${job.original_url.substring(0, 60)}... (${result.reason})`)
            }
            
            // Small delay between checks
            await sleep(500)
        }
        
        // Delete dead links found
        if (deadLinkIds.length > 0) {
            const { error: delError } = await supabase
                .from('external_jobs')
                .delete()
                .in('id', deadLinkIds)
            
            if (!delError) {
                stats.deletedDeadLinks += deadLinkIds.length
                console.log(`\n   ✅ Deleted ${deadLinkIds.length} dead links`)
            }
        }
    }

    // ============================================
    // PHASE 4: Summary
    // ============================================
    console.log('\n' + '='.repeat(50))
    console.log('📊 CLEANUP SUMMARY')
    console.log('='.repeat(50))
    console.log(`   Fake links removed:    ${stats.deletedFakeLinks}`)
    console.log(`   Dead links removed:    ${stats.deletedDeadLinks}`)
    console.log(`   Links verified alive:  ${stats.verifiedAlive}`)
    console.log(`   Errors encountered:    ${stats.errors}`)
    console.log('='.repeat(50))
    
    // Get final count
    const { count } = await supabase
        .from('external_jobs')
        .select('*', { count: 'exact', head: true })
    
    console.log(`\n✅ Database now has ${count || 0} verified job listings`)
    console.log('🏁 Cleanup complete!\n')
    
    return stats
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Run cleanup
cleanupDeadLinks()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal error:', err)
        process.exit(1)
    })
