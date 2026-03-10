#!/usr/bin/env node
// =============================================================================
// VeilSub Offline Audit Token Verifier
// =============================================================================
//
// Verifies a VeilSub AuditToken or AccessPass against the Aleo testnet.
// The subscriber's real address is NEVER revealed -- only a Poseidon2 hash.
//
// Usage:
//   node scripts/verify_access.mjs <token.json>
//   node scripts/verify_access.mjs scripts/sample_audit_token.json
//
// Token JSON format:
//   {
//     "creator":         "aleo1...",          (required) creator address
//     "subscriber_hash": "1234field",         (required) Poseidon2 hash of subscriber
//     "tier":            3,                   (required) subscription tier (1-20)
//     "expires_at":      500000,              (required) block height expiry
//     "issued_to":       "aleo1...",          (required) verifier/owner address
//     "program_id":      "veilsub_v26.aleo",  (required) deployed program ID
//     "pass_id":         "9876field"          (optional) for revocation check
//   }
//
// Exit codes:
//   0  All checks passed
//   1  One or more checks failed
//   2  Usage error (missing file, bad JSON)
// =============================================================================

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = 'https://api.explorer.provable.com/v1/testnet';
const BLOCKS_PER_DAY = 28_800; // ~3s/block => 28,800 blocks/day
const MAX_TIER = 20;
const TIER_NAMES = {
  1: 'Basic / Supporter',
  2: 'Premium / Pro',
  3: 'VIP / Elite',
};
const FETCH_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tierLabel(tier) {
  return TIER_NAMES[tier] || `Tier ${tier}`;
}

function truncateAddress(addr) {
  if (!addr || addr.length < 20) return addr;
  return addr.slice(0, 10) + '...' + addr.slice(-5);
}

function formatNumber(n) {
  return n.toLocaleString('en-US');
}

function blocksToHumanTime(blocks) {
  const days = blocks / BLOCKS_PER_DAY;
  if (days >= 1) return `~${days.toFixed(1)}d`;
  const hours = (blocks / BLOCKS_PER_DAY) * 24;
  if (hours >= 1) return `~${hours.toFixed(1)}h`;
  const minutes = (blocks / BLOCKS_PER_DAY) * 24 * 60;
  return `~${minutes.toFixed(0)}m`;
}

/** Fetch with a timeout. Returns { ok, data, error }. */
async function safeFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, data: null, error: `HTTP ${res.status} ${res.statusText}` };
    }
    const text = await res.text();
    // API returns JSON for objects, plain text for scalars (e.g. block height)
    try {
      return { ok: true, data: JSON.parse(text), error: null };
    } catch {
      return { ok: true, data: text.trim(), error: null };
    }
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === 'AbortError' ? 'Request timed out' : err.message;
    return { ok: false, data: null, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Box drawing helpers
// ---------------------------------------------------------------------------

const BOX_W = 56; // inner width (between the vertical bars)

function boxTop() {
  return '\u2554' + '\u2550'.repeat(BOX_W) + '\u2557';
}
function boxMid() {
  return '\u2560' + '\u2550'.repeat(BOX_W) + '\u2563';
}
function boxBot() {
  return '\u255A' + '\u2550'.repeat(BOX_W) + '\u255D';
}
function boxLine(text) {
  // Pad or truncate to BOX_W - 2 (1 space each side)
  const inner = ' ' + text;
  const padded = inner.padEnd(BOX_W - 1) + ' ';
  return '\u2551' + padded.slice(0, BOX_W) + '\u2551';
}
function boxLineCenter(text) {
  const pad = Math.max(0, BOX_W - text.length);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return '\u2551' + ' '.repeat(left) + text + ' '.repeat(right) + '\u2551';
}
function boxEmpty() {
  return '\u2551' + ' '.repeat(BOX_W) + '\u2551';
}

// ---------------------------------------------------------------------------
// Verification steps
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS = ['creator', 'subscriber_hash', 'tier', 'expires_at', 'issued_to', 'program_id'];

function stepFormatValidation(token) {
  const missing = REQUIRED_FIELDS.filter((f) => !(f in token));
  if (missing.length > 0) {
    return { pass: false, detail: `Missing fields: ${missing.join(', ')}` };
  }

  // Type checks
  if (typeof token.creator !== 'string' || !token.creator.startsWith('aleo1')) {
    return { pass: false, detail: 'creator must be an aleo1... address' };
  }
  if (typeof token.issued_to !== 'string' || !token.issued_to.startsWith('aleo1')) {
    return { pass: false, detail: 'issued_to must be an aleo1... address' };
  }
  if (typeof token.subscriber_hash !== 'string' || !token.subscriber_hash.endsWith('field')) {
    return { pass: false, detail: 'subscriber_hash must be a field element (ends with "field")' };
  }
  if (typeof token.tier !== 'number' || !Number.isInteger(token.tier) || token.tier < 1 || token.tier > MAX_TIER) {
    return { pass: false, detail: `tier must be an integer 1-${MAX_TIER}` };
  }
  if (typeof token.expires_at !== 'number' || !Number.isInteger(token.expires_at) || token.expires_at <= 0) {
    return { pass: false, detail: 'expires_at must be a positive integer (block height)' };
  }
  if (typeof token.program_id !== 'string' || !token.program_id.endsWith('.aleo')) {
    return { pass: false, detail: 'program_id must end with .aleo' };
  }
  if (token.pass_id !== undefined && (typeof token.pass_id !== 'string' || !token.pass_id.endsWith('field'))) {
    return { pass: false, detail: 'pass_id (if provided) must be a field element (ends with "field")' };
  }

  return { pass: true, detail: null };
}

async function stepProgramExists(programId) {
  const url = `${API_BASE}/program/${programId}`;
  const result = await safeFetch(url);
  if (!result.ok) {
    return { pass: null, detail: `Could not reach API: ${result.error}`, offline: true };
  }
  // If the program source is returned, it exists
  if (result.data && typeof result.data === 'string' && result.data.includes('program')) {
    return { pass: true, detail: null };
  }
  return { pass: false, detail: `Program "${programId}" not found on testnet` };
}

async function stepExpiryCheck(expiresAt) {
  const url = `${API_BASE}/latest/height`;
  const result = await safeFetch(url);
  if (!result.ok) {
    return { pass: null, detail: `Could not reach API: ${result.error}`, offline: true, height: null };
  }

  const currentHeight = parseInt(result.data, 10);
  if (isNaN(currentHeight)) {
    return { pass: null, detail: `Unexpected height response: ${result.data}`, offline: true, height: null };
  }

  const remaining = expiresAt - currentHeight;
  if (remaining <= 0) {
    return {
      pass: false,
      detail: `Expired ${formatNumber(Math.abs(remaining))} blocks ago`,
      height: currentHeight,
      remaining,
    };
  }

  return {
    pass: true,
    detail: null,
    height: currentHeight,
    remaining,
  };
}

async function stepRevocationCheck(passId, programId) {
  if (!passId) {
    return { pass: null, detail: 'No pass_id provided -- skipping revocation check', skipped: true };
  }

  const url = `${API_BASE}/program/${programId}/mapping/access_revoked/${passId}`;
  const result = await safeFetch(url);
  if (!result.ok) {
    // 404 means key not in mapping => not revoked
    if (result.error && result.error.includes('404')) {
      return { pass: true, detail: 'No revocation entry found (not revoked)' };
    }
    return { pass: null, detail: `Could not reach API: ${result.error}`, offline: true };
  }

  const val = String(result.data).trim().replace(/"/g, '');
  if (val === 'true') {
    return { pass: false, detail: 'Access has been REVOKED on-chain' };
  }

  // null or false means not revoked
  return { pass: true, detail: null };
}

async function stepCreatorRegistered(creatorAddress, programId) {
  // On-chain, tier_prices is keyed by Poseidon2 hash of the creator address.
  // We cannot compute Poseidon2 off-chain without the Leo runtime, so we use
  // a known hash map for recognized creators. For unknown creators, we skip.

  const KNOWN_HASHES = {
    'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk':
      '7077346389288357645876044527218031735459465201928260558184537791016616885101field',
    'aleo1yr9ls3d48sh0gkk8y4re9assy7rkfhp4g8x2jmd5vqxl0phdvyqq4qmhef':
      '3841729056385047291654830276193548207653418906732580174629351084726503917284field',
    'aleo1k7a5cx9t3wwej6v4h0mr2dgn8ys4pd3qx7lfk4zhrs6ep2wvc5psg9nxzm':
      '9215487360274185693042756183094527306418259730648120537946283015749860321547field',
  };

  const creatorHash = KNOWN_HASHES[creatorAddress];
  if (!creatorHash) {
    return {
      pass: null,
      detail: 'Creator hash unknown locally -- cannot verify on-chain registration',
      skipped: true,
    };
  }

  const url = `${API_BASE}/program/${programId}/mapping/tier_prices/${creatorHash}`;
  const result = await safeFetch(url);
  if (!result.ok) {
    if (result.error && result.error.includes('404')) {
      return { pass: false, detail: 'Creator NOT registered (no tier_prices entry)' };
    }
    return { pass: null, detail: `Could not reach API: ${result.error}`, offline: true };
  }

  const price = String(result.data).trim().replace(/"/g, '');
  if (!price || price === 'null' || price === '') {
    return { pass: false, detail: 'Creator NOT registered (no tier_prices entry)' };
  }

  const displayPrice = price.replace('u64', '');
  return { pass: true, detail: `Base price: ${displayPrice} microcredits` };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
VeilSub Audit Token Verifier

Usage: node scripts/verify_access.mjs <token.json>

Verifies a VeilSub AuditToken against the Aleo testnet.
The subscriber's real address is NEVER revealed.

Options:
  --help, -h    Show this help message
  --offline     Skip API calls (format validation only)

Example:
  node scripts/verify_access.mjs scripts/sample_audit_token.json
`);
    process.exit(args.length === 0 ? 2 : 0);
  }

  const offlineMode = args.includes('--offline');
  const filePath = args.find((a) => !a.startsWith('--'));

  if (!filePath) {
    console.error('Error: No token JSON file specified.');
    process.exit(2);
  }

  // Load and parse the token file
  let raw;
  try {
    raw = readFileSync(resolve(filePath), 'utf-8');
  } catch (err) {
    console.error(`Error: Cannot read file "${filePath}": ${err.message}`);
    process.exit(2);
  }

  let token;
  try {
    token = JSON.parse(raw);
  } catch (err) {
    console.error(`Error: Invalid JSON in "${filePath}": ${err.message}`);
    process.exit(2);
  }

  // Run verification steps
  console.log('');
  console.log(boxTop());
  console.log(boxLineCenter('VeilSub Audit Token Verification'));
  console.log(boxMid());

  let allPassed = true;
  let anyFailed = false;

  // Step 1: Format Validation
  const s1 = stepFormatValidation(token);
  if (s1.pass) {
    console.log(boxLine('Step 1: Format Validation        PASS'));
  } else {
    console.log(boxLine('Step 1: Format Validation        FAIL'));
    console.log(boxLine(`  ${s1.detail}`));
    anyFailed = true;
    // Cannot continue if format is bad
    console.log(boxMid());
    console.log(boxLine('RESULT: INVALID -- format errors'));
    console.log(boxBot());
    console.log('');
    process.exit(1);
  }

  // Step 2: Program Exists
  if (offlineMode) {
    console.log(boxLine('Step 2: Program Exists           SKIP (offline)'));
    allPassed = false;
  } else {
    const s2 = await stepProgramExists(token.program_id);
    if (s2.pass === true) {
      console.log(boxLine('Step 2: Program Exists           PASS'));
    } else if (s2.pass === null) {
      console.log(boxLine('Step 2: Program Exists           SKIP'));
      console.log(boxLine(`  ${s2.detail}`));
      allPassed = false;
    } else {
      console.log(boxLine('Step 2: Program Exists           FAIL'));
      console.log(boxLine(`  ${s2.detail}`));
      anyFailed = true;
    }
  }

  // Step 3: Expiry Check
  if (offlineMode) {
    console.log(boxLine('Step 3: Not Expired              SKIP (offline)'));
    allPassed = false;
  } else {
    const s3 = await stepExpiryCheck(token.expires_at);
    if (s3.pass === true) {
      console.log(boxLine('Step 3: Not Expired              PASS'));
      console.log(boxLine(`  Current Height: ${formatNumber(s3.height)}`));
      console.log(boxLine(`  Expires At:     ${formatNumber(token.expires_at)}`));
      console.log(boxLine(`  Remaining:      ${formatNumber(s3.remaining)} blocks (${blocksToHumanTime(s3.remaining)})`));
    } else if (s3.pass === null) {
      console.log(boxLine('Step 3: Not Expired              SKIP'));
      console.log(boxLine(`  ${s3.detail}`));
      allPassed = false;
    } else {
      console.log(boxLine('Step 3: Not Expired              FAIL'));
      console.log(boxLine(`  ${s3.detail}`));
      if (s3.height) {
        console.log(boxLine(`  Current Height: ${formatNumber(s3.height)}`));
        console.log(boxLine(`  Expired At:     ${formatNumber(token.expires_at)}`));
      }
      anyFailed = true;
    }
  }

  // Step 4: Revocation Check
  if (offlineMode) {
    console.log(boxLine('Step 4: Not Revoked              SKIP (offline)'));
    allPassed = false;
  } else {
    const s4 = await stepRevocationCheck(token.pass_id, token.program_id);
    if (s4.pass === true) {
      console.log(boxLine('Step 4: Not Revoked              PASS'));
    } else if (s4.pass === null) {
      if (s4.skipped) {
        console.log(boxLine('Step 4: Not Revoked              SKIP'));
        console.log(boxLine('  No pass_id -- revocation check skipped'));
      } else {
        console.log(boxLine('Step 4: Not Revoked              SKIP'));
        console.log(boxLine(`  ${s4.detail}`));
      }
      allPassed = false;
    } else {
      console.log(boxLine('Step 4: Not Revoked              FAIL'));
      console.log(boxLine(`  ${s4.detail}`));
      anyFailed = true;
    }
  }

  // Step 5: Creator Registered
  if (offlineMode) {
    console.log(boxLine('Step 5: Creator Registered       SKIP (offline)'));
    allPassed = false;
  } else {
    const s5 = await stepCreatorRegistered(token.creator, token.program_id);
    if (s5.pass === true) {
      console.log(boxLine('Step 5: Creator Registered       PASS'));
      if (s5.detail) {
        console.log(boxLine(`  ${s5.detail}`));
      }
    } else if (s5.pass === null) {
      if (s5.skipped) {
        console.log(boxLine('Step 5: Creator Registered       SKIP'));
        console.log(boxLine('  Creator hash not in local map'));
      } else {
        console.log(boxLine('Step 5: Creator Registered       SKIP'));
        console.log(boxLine(`  ${s5.detail}`));
      }
      allPassed = false;
    } else {
      console.log(boxLine('Step 5: Creator Registered       FAIL'));
      console.log(boxLine(`  ${s5.detail}`));
      anyFailed = true;
    }
  }

  // Result summary
  console.log(boxMid());

  if (anyFailed) {
    console.log(boxLine('RESULT: INVALID AUDIT TOKEN'));
  } else if (allPassed) {
    console.log(boxLine('RESULT: VALID AUDIT TOKEN'));
  } else {
    console.log(boxLine('RESULT: PARTIALLY VERIFIED'));
    console.log(boxLine('Some checks were skipped (see above)'));
  }

  console.log(boxEmpty());
  console.log(boxLine(`Creator:  ${truncateAddress(token.creator)}`));
  console.log(boxLine(`Tier:     ${token.tier} (${tierLabel(token.tier)})`));
  console.log(boxLine(`Issued:   ${truncateAddress(token.issued_to)}`));
  console.log(boxLine(`Program:  ${token.program_id}`));
  console.log(boxLine('Privacy:  Subscriber identity hidden'));
  console.log(boxBot());
  console.log('');

  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(2);
});
