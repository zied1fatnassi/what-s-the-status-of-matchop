import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_BASE_HEADERS = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEV_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173'])

function getAllowedOrigins() {
    const siteUrl = (Deno.env.get('SITE_URL') ?? '').trim().replace(/\/+$/, '')
    const allowed = new Set(DEV_ORIGINS)
    if (siteUrl) allowed.add(siteUrl)
    return allowed
}

function getCorsHeaders(origin) {
    const allowed = getAllowedOrigins()
    const allowOrigin = origin && allowed.has(origin) ? origin : 'null'
    return { ...CORS_BASE_HEADERS, 'Access-Control-Allow-Origin': allowOrigin, 'Vary': 'Origin' }
}

/**
 * Generate embeddings using a free embedding model via OpenRouter
 * Stores the embedding in the appropriate table (students or offers)
 */
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(req.headers.get('origin')) })
    }

    try {
        // --- Auth check ---
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ success: false, error: 'Authorization required' }), {
                status: 401, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' }
            })
        }
        const supabaseAuth = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
                status: 401, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' }
            })
        }
        // --- End auth check ---

        const { text, type, id } = await req.json()

        // Validate input
        if (!text || !type || !id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing required fields: text, type, id'
            }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        if (!['student', 'job'].includes(type)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Type must be "student" or "job"'
            }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const apiKey = Deno.env.get('OPENROUTER_API_KEY')
        if (!apiKey) {
            return new Response(JSON.stringify({
                success: false,
                error: 'OpenRouter API key not configured'
            }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 500,
            })
        }

        // Use a free embedding model - we'll use the text-embedding approach
        // OpenRouter doesn't have free embedding models, so we'll use a workaround:
        // Call the LLM to generate a semantic hash that we can compute embeddings from
        // OR use Supabase's built-in pg_net to call an embedding API

        // For now, let's use a simple approach: generate embeddings using a lightweight method
        // We'll use the Hugging Face Inference API which has free tier for embeddings

        const hfApiKey = Deno.env.get('HF_API_KEY') || apiKey // Fallback to OpenRouter key

        // Use Hugging Face's free embedding model
        const embeddingResponse = await fetch(
            'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${hfApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: text.substring(0, 512), // Limit to 512 chars
                    options: { wait_for_model: true }
                }),
            }
        )

        if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text()
            console.error('Embedding API Error:', errorText)

            // Fallback: generate a simple hash-based embedding
            // This is not as good but allows the system to work
            const fallbackEmbedding = generateFallbackEmbedding(text)
            await storeEmbedding(type, id, fallbackEmbedding)

            return new Response(JSON.stringify({
                success: true,
                message: 'Used fallback embedding',
                dimensions: fallbackEmbedding.length
            }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const embedding = await embeddingResponse.json()

        // Store in database
        await storeEmbedding(type, id, embedding)

        return new Response(JSON.stringify({
            success: true,
            dimensions: embedding.length
        }), {
            headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Generate Embedding Error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'An unexpected error occurred'
        }), {
            headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

// Store embedding in the appropriate table
async function storeEmbedding(type: string, id: string, embedding: number[]) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const table = type === 'student' ? 'students' : 'offers'
    const idColumn = 'id' // Both tables use 'id' as primary key

    // Format embedding as pgvector expects: [0.1, 0.2, ...]
    const embeddingString = `[${embedding.join(',')}]`

    const { error } = await supabase
        .from(table)
        .update({ embedding: embeddingString })
        .eq(idColumn, id)

    if (error) {
        console.error('Store embedding error:', error)
        throw new Error(`Failed to store embedding: ${error.message}`)
    }
}

// Fallback: Generate a simple deterministic embedding from text
// Uses character-based hashing to create a 384-dimensional vector
function generateFallbackEmbedding(text: string): number[] {
    const dimensions = 384
    const embedding = new Array(dimensions).fill(0)

    // Normalize text
    const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    const words = normalizedText.split(/\s+/).filter(w => w.length > 0)

    // Generate embedding based on character and word patterns
    for (let i = 0; i < normalizedText.length; i++) {
        const charCode = normalizedText.charCodeAt(i)
        const idx = (charCode * (i + 1)) % dimensions
        embedding[idx] += 1 / Math.sqrt(normalizedText.length)
    }

    // Add word-level features
    words.forEach((word, wordIdx) => {
        const wordHash = word.split('').reduce((acc, char, i) =>
            acc + char.charCodeAt(0) * (i + 1), 0)
        const idx = wordHash % dimensions
        embedding[idx] += 0.1 / Math.sqrt(words.length)
    })

    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
        for (let i = 0; i < dimensions; i++) {
            embedding[i] /= magnitude
        }
    }

    return embedding
}
