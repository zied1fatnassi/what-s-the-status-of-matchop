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


async function main() {
    console.log(' Testing Matchop V3 API...');

    // 2. AUTHENTICATION
    const email = TEST_EMAIL;
    const password = TEST_PASSWORD;

    console.log(`\n Authenticating as ${email}...`);

    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError || !session) {
        console.error(' Login Failed:', authError?.message || 'No Session (Check Email Confirmation!)');
        return;
    }

    console.log('    Signed In. ID:', session.user.id);

    // 3. SYNC PROFILE DATA (CRITICAL STEP)
    // We must ensure this Auth User has the "Ahmed Tounsi" data for the Algo to work.
    console.log('\n Syncing Student Profile Data...');

    // A. Check if Profile exists
    const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

    if (checkError && checkError.code !== 'PGRST116') {
        console.warn('     Profile Check Error (Ignoring):', checkError.message);
    }

    if (!existingProfile) {
        console.log('     Profile not found via client. Attempting Insert...');
        const { error: insertError } = await supabase.from('profiles').insert({
            id: session.user.id,
            email: email,
            role: 'student'
        });
        if (insertError) {
            console.warn('    Profile Insert Failed (Might already exist?):', insertError.message);
            // Do NOT return. Proceed.
        }
    } else {
        console.log('     Profile exists. Updating...');
        const { error: updateError } = await supabase.from('profiles').update({
            email: email,
            role: 'student'
        }).eq('id', session.user.id);

        if (updateError) {
            console.warn('    Profile Update Failed:', updateError.message);
        }
    }

    // B. Check if Student Record exists
    const { data: existingStudent, error: studentCheckError } = await supabase
        .from('students')
        .select('id')
        .eq('id', session.user.id)
        .single();

    if (studentCheckError && studentCheckError.code !== 'PGRST116') {
        console.warn('     Student Check Error (Ignoring):', studentCheckError.message);
    }

    const studentData = {
        id: session.user.id,
        display_name: 'Ahmed Tounsi',
        skills: ['Python', 'React', 'AI'],
        location: 'Tunis',
        location_point: 'POINT(10.1815 36.8065)'
    };

    if (!existingStudent) {
        console.log('     Student record not found via client. Attempting Insert...');
        const { error: studentInsertError } = await supabase.from('students').insert(studentData);
        if (studentInsertError) {
            console.warn('    Student Insert Failed:', studentInsertError.message);
        }
    } else {
        console.log('     Student record exists. Updating...');
        const { error: studentUpdateError } = await supabase.from('students').update(studentData).eq('id', session.user.id);
        if (studentUpdateError) {
            console.warn('    Student Update Failed:', studentUpdateError.message);
        }
    }

    console.log('    Profile Sync Attempted. Proceeding to Match Engine...');

    // DEBUG: Check Data Existence
    console.log('\n Debugging Data Existence...');
    const { count: offerCount, error: offerErr } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true });
    console.log(`   Offers in DB (Active): ${offerCount} (Error: ${offerErr?.message || 'None'})`);

    const { data: myself, error: meErr } = await supabase
        .from('students')
        .select('*')
        .eq('id', session.user.id);
    console.log(`   My Student Record: ${myself?.length ? 'Found' : 'MISSING'} (Error: ${meErr?.message || 'None'})`);


    // 4. INVOKE FUNCTION
    console.log('\n Invoking match-recommendations...');

    const { data, error } = await supabase.functions.invoke('match-recommendations', {
        body: {
            limit: 5,
            offset: 0,
            distance: 50 // 50km
        }
    });

    if (error) {
        console.error(' API Error Object:', error);
        // Sometimes the 'error' object from invoke contains the response itself if it's a 4xx/5xx
        if (error.context && typeof error.context.json === 'function') {
            try {
                const body = await error.context.json();
                console.error(' API Response Body:', body);
            } catch (e) { console.error('   (Could not parse error body)'); }
        }
    } else {
        console.log(' Success! Recommendations received:');
        console.log('---------------------------------------------------');
        const results = data.data || []; // Access the nested 'data' property
        if (Array.isArray(results) && results.length > 0) {
            results.forEach((offer, i) => {
                console.log(`#${i + 1}: ${offer.title} @ ${offer.company_name}`);
                console.log(`    Score: ${offer.match_score} (Skills: ${offer.skill_match_pct || '?'}%)`);
                console.log(`    Location: ${offer.location || 'Unknown'} (${offer.dist_km !== undefined ? offer.dist_km + 'km' : 'N/A'})`);
                console.log('---------------------------------------------------');
            });

            // Validation
            const topMatch = results[0];
            if (topMatch.company_name === 'InstaDeep' && topMatch.match_score >= 80) {
                console.log('\n VALIDATION PASSED: Correctly recommended InstaDeep (Tunis) as top match!');
            } else {
                console.log('\n VALIDATION WARNING: Unexpected top match.');
            }

        } else {
            console.log('   No matches found (Check DB seed data or distance filter).');
        }
        console.log('\nFull JSON Response:');
        console.log(JSON.stringify(data, null, 2));
    }
}

main();
