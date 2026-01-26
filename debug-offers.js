import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugOffers() {
    console.log('🔍 DEBUGGING OFFERS QUERY\n');

    // Test 1: Check if offers table exists and has data
    console.log('1️⃣ Checking offers table...');
    const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('*');

    console.log('   Offers count:', offers?.length || 0);
    console.log('   Error:', offersError);
    if (offers?.length > 0) {
        console.log('   First offer:', offers[0]);
    }

    // Test 2: Check companies table
    console.log('\n2️⃣ Checking companies table...');
    const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*');

    console.log('   Companies count:', companies?.length || 0);
    console.log('   Error:', companiesError);

    // Test 3: Try the exact query from useJobOffers
    console.log('\n3️⃣ Testing EXACT useJobOffers query...');
    const { data: joinResult, error: joinError } = await supabase
        .from('offers')
        .select('*, companies!company_id(id, company_name, logo_url, industry)')
        .eq('status', 'active');

    console.log('   Result count:', joinResult?.length || 0);
    console.log('   Error:', joinError);
    if (joinResult?.length > 0) {
        console.log('   First result:', JSON.stringify(joinResult[0], null, 2));
    }

    // Test 4: Check if InstaDeep offer exists
    console.log('\n4️⃣ Looking for InstaDeep offer...');
    const { data: instaDeep, error: instaError } = await supabase
        .from('offers')
        .select('*, companies!company_id(*)')
        .eq('title', 'Senior AI Engineer');

    console.log('   Found:', instaDeep?.length || 0);
    console.log('   Error:', instaError);
    if (instaDeep?.length > 0) {
        console.log('   Offer:', JSON.stringify(instaDeep[0], null, 2));
    }
}

debugOffers();
