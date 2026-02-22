import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

function getEnv(name, fallbackName) {
    return process.env[name] || (fallbackName ? process.env[fallbackName] : '');
}

function requireEnv(name, fallbackName) {
    const value = getEnv(name, fallbackName);
    if (!value) {
        const alias = fallbackName ? ` (or ${fallbackName})` : '';
        console.error(`Missing required env var: ${name}${alias}`);
        process.exit(1);
    }
    return value;
}

// 1. CONFIGURATION
const SUPABASE_URL = requireEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
const SUPABASE_KEY = requireEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');
const TEST_EMAIL = requireEnv('MATCHOP_TEST_EMAIL');
const TEST_PASSWORD = requireEnv('MATCHOP_TEST_PASSWORD');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


async function testDoubleOptIn() {
    console.log(' Testing Double-Opt-In Flow...');

    // 1. LOGIN
    const email = TEST_EMAIL;
    const password = TEST_PASSWORD;
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !session) {
        console.error(' Login Failed:', authError);
        return;
    }
    console.log(' Signed In:', session.user.id);
    const userId = session.user.id;

    // 2. GET RECOMMENDATIONS
    console.log('\n Fetching Recommendations...');
    const { data: recResponse, error: recError } = await supabase.functions.invoke('match-recommendations', {
        body: { limit: 1, distance: 50 }
    });

    if (recError || !recResponse?.data?.length) {
        console.error(' No Recommendations found to swipe on!');
        return;
    }

    const targetOffer = recResponse.data[0];
    console.log(` Found Offer to Swipe: "${targetOffer.title}" @ ${targetOffer.company_name} (ID: ${targetOffer.offer_id})`);


    // 3. STUDENT SWIPE RIGHT
    console.log('\n Student Swiping RIGHT...');
    const { error: swipeError } = await supabase.from('student_swipes').upsert({
        student_id: userId,
        offer_id: targetOffer.offer_id, // Note: Function returns 'offer_id', table expects 'offer_id'
        direction: 'right'
    }, { onConflict: 'student_id, offer_id' });

    if (swipeError) {
        console.error(' Student Swipe Failed:', swipeError);
        return;
    }
    console.log(' Student Swiped Right.');


    // 4. VERIFY NO MATCH YET (Pending)
    const { data: matchCheck1 } = await supabase.from('matches')
        .select('*')
        .eq('student_id', userId)
        .eq('offer_id', targetOffer.offer_id)
        .single();

    if (matchCheck1) {
        console.error(' Premature Match! (Did company already swipe?)');
    } else {
        console.log(' No Match yet (Expected). Waiting for Company...');
    }


    // 5. SIMULATE COMPANY SWIPE RIGHT (using Debug RPC)
    console.log('\n Simulating Company Response (RPC)...');
    const { error: rpcError } = await supabase.rpc('debug_company_swipe', {
        target_student_id: userId,
        target_offer_id: targetOffer.offer_id,
        swipe_direction: 'right'
    });

    if (rpcError) {
        console.error(' Company Simulation Failed:', rpcError);
        return;
    }
    console.log(' Company Swiped Right.');


    // 6. FINAL VERIFICATION
    console.log('\n Verifying Match Creation...');

    // First, try simple select to isolate permission issues
    const { data: finalMatch, error: finalError } = await supabase.from('matches')
        .select('*')
        .eq('student_id', userId)
        .eq('offer_id', targetOffer.offer_id)
        .single();

    if (finalError || !finalMatch) {
        console.error(' MATCH FAILED! Trigger did not fire (or RLS Blocked)?');
        console.error('   Error Details:', finalError);
    } else {
        console.log(' MATCH CONFIRMED! ');
        console.log(`   Match ID: ${finalMatch.id}`);
        console.log(`   Status: ${finalMatch.status}`);
        console.log('   (Company details omitted to bypass potential RLS join issues)');
    }
}

testDoubleOptIn();
