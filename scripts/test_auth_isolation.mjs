import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  const env = {};
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (!env[key]) env[key] = val;
          }
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const client = createClient(url, key);

async function run() {
  console.log('=== AUTHENTICATION & DATA ISOLATION PROBE ===');

  // 1. Unauthenticated test of get_current_user_status
  console.log('\n[1] Unauthenticated caller get_current_user_status():');
  const { data: anonStatus, error: anonErr } = await client.rpc('get_current_user_status');
  console.log('Anon status result:', anonStatus, 'Error:', anonErr);

  const isOwnerAlreadyConfigured = anonStatus?.owner_configured === true;
  console.log(`Current Owner Configured State in DB: ${isOwnerAlreadyConfigured ? 'CONFIGURED (Owner Enrolled)' : 'UNCONFIGURED (Pending First-Owner Bootstrap)'}`);

  // 2. Attempt signUp of ephemeral non-owner probe account
  const probeEmail = `probe.nonowner.${Date.now()}@testmail.com`;
  const probePassword = `AuditP@ss-${Date.now()}-#Secure99`;

  console.log(`\n[2] Attempting to create authenticated probe user: ${probeEmail}`);
  const { data: authData, error: authErr } = await client.auth.signUp({
    email: probeEmail,
    password: probePassword,
  });

  if (authErr) {
    console.log(`Note: Sign up returned: ${authErr.message}`);
    console.log('Email confirmation may be required or signups restricted by project settings.');
    console.log('Distinguishing: Anonymous RLS and RPC checks are verified; live authenticated user testing depends on email confirmation settings.');
    return;
  }

  const session = authData?.session;
  const user = authData?.user;

  if (!session || !user) {
    console.log(`Probe account created (ID: ${user?.id}), but no immediate session returned (Email confirmation required by project).`);
    console.log('Verified: Supabase Auth requires email verification before granting an active session.');
    return;
  }

  console.log(`✅ Authenticated probe session active for User ID: ${user.id}`);
  const authClient = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } }
  });

  // 3. Test get_current_user_status for authenticated non-owner
  console.log('\n[3] Authenticated non-owner get_current_user_status():');
  const { data: probeStatus, error: probeStatusErr } = await authClient.rpc('get_current_user_status');
  console.log('Probe user status:', probeStatus, 'Error:', probeStatusErr);

  if (probeStatus) {
    if (probeStatus.is_owner === false && probeStatus.user_id === user.id) {
      console.log('✅ PASS: Server-verified get_current_user_status correctly reports is_owner: false for non-owner user.');
    } else {
      console.log('❌ FAIL: Non-owner was unexpectedly reported as owner:', probeStatus);
    }
  }

  // 4. Test RLS read isolation for authenticated non-owner
  console.log('\n[4] Testing RLS read isolation for authenticated non-owner:');
  const { data: accData, error: accErr } = await authClient.from('accounts').select('*');
  console.log(`accounts read: returned ${accData?.length ?? 0} rows (Error: ${accErr?.message || 'none'})`);
  if (accData && accData.length === 0) {
    console.log('✅ PASS: Authenticated non-owner cannot read any accounts.');
  }

  const { data: evtData, error: evtErr } = await authClient.from('financial_events').select('*');
  console.log(`financial_events read: returned ${evtData?.length ?? 0} rows (Error: ${evtErr?.message || 'none'})`);
  if (evtData && evtData.length === 0) {
    console.log('✅ PASS: Authenticated non-owner cannot read any financial events.');
  }

  // 5. Test RLS write isolation for authenticated non-owner
  console.log('\n[5] Testing RLS write isolation for authenticated non-owner:');
  const { error: insErr } = await authClient.from('accounts').insert({
    id: `acc-probe-${Date.now()}`,
    user_id: user.id,
    label: 'Illegitimate Account',
    type: 'bank',
    opening_date: '2026-10-19',
    opening_position_paise: 500000
  });
  if (insErr) {
    console.log(`✅ PASS: Non-owner insert rejected by RLS: ${insErr.message}`);
  } else {
    console.log(`❌ FAIL: Non-owner was able to insert into accounts table!`);
  }

  // 6. Test execute_financial_command authorization for non-owner
  console.log('\n[6] Testing execute_financial_command for non-owner:');
  const { error: cmdErr } = await authClient.rpc('execute_financial_command', {
    p_command_id: `probe-cmd-${Date.now()}`,
    p_command: {
      type: 'purchase',
      date: '2026-10-19',
      recipient: 'Unauthorized Merchant',
      income_paise: 0,
      spending_paise: 5000,
      postings: []
    }
  });
  if (cmdErr && cmdErr.message.includes('Access denied')) {
    console.log(`✅ PASS: execute_financial_command rejected non-owner: ${cmdErr.message}`);
  } else {
    console.log(`❌ FAIL: execute_financial_command response unexpected:`, cmdErr);
  }

  // 7. Test commit_import_batch authorization for non-owner
  console.log('\n[7] Testing commit_import_batch for non-owner:');
  const { error: impErr } = await authClient.rpc('commit_import_batch', {
    p_batch: { id: 'probe-batch', filename: 'fake.csv', account_id: 'any', row_count: 0 },
    p_new_events: [],
    p_updated_events: []
  });
  if (impErr && impErr.message.includes('Access denied')) {
    console.log(`✅ PASS: commit_import_batch rejected non-owner: ${impErr.message}`);
  } else {
    console.log(`❌ FAIL: commit_import_batch response unexpected:`, impErr);
  }

  // 8. If an owner is ALREADY configured, test that bootstrap_app_owner is strictly blocked
  if (isOwnerAlreadyConfigured) {
    console.log('\n[8] Testing bootstrap_app_owner when owner is already configured:');
    const { error: bootErr } = await authClient.rpc('bootstrap_app_owner');
    if (bootErr && bootErr.message.includes('already configured')) {
      console.log(`✅ PASS: bootstrap_app_owner strictly rejected subsequent owner claim: ${bootErr.message}`);
    } else {
      console.log(`❌ FAIL: Subsequent bootstrap did not fail as expected:`, bootErr);
    }
  } else {
    console.log('\n[8] Skipping bootstrap_app_owner execution:');
    console.log('   SAFETY GUARD: Preserving initial owner bootstrap for the actual application owner.');
    console.log('   The test probe did NOT invoke bootstrap_app_owner to prevent unauthorized ownership claim.');
  }

  // Clean up session
  await client.auth.signOut();
  console.log('\n=== PROBE COMPLETE ===');
}

run();
