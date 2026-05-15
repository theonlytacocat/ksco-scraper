/**
 * backfill-add-desc.js
 *
 * One-time script to populate addDesc on existing charge_log.json entries.
 *
 * Strategy:
 *  1. Re-fetch the live roster to get current detailUrls (works for in-custody).
 *  2. For released inmates: try constructing a detail URL from inmateId
 *     via the booking search — e.g. ?InmateID=40028064.
 *  3. For each log entry whose charges are missing addDesc, fetch the detail
 *     page and merge in the addDesc values by matching charge index.
 *  4. Write the updated change_log.json back.
 *
 * Run with:  node --experimental-vm-modules backfill-add-desc.js
 *  or just:  node backfill-add-desc.js  (if package.json has "type":"module")
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { fetchRoster, fetchDetail } from './scrapers/kitsap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_FILE  = path.join(__dirname, 'data', 'change_log.json');
const DELAY_MS  = 600; // be polite to the server

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function needsBackfill(entry) {
  if (!entry.charges?.length) return false;
  // If every charge already has addDesc (including null set intentionally), skip.
  // We detect "not yet backfilled" by the key being entirely absent.
  return entry.charges.some(c => !Object.prototype.hasOwnProperty.call(c, 'addDesc'));
}

async function main() {
  console.log('Loading change_log.json...');
  const log = readJSON(LOG_FILE);

  const needsWork = log.filter(needsBackfill);
  console.log(`${needsWork.length} / ${log.length} entries need backfill.`);
  if (needsWork.length === 0) { console.log('Nothing to do.'); return; }

  // ── Step 1: fresh roster fetch → bookingNumber → detailUrl map ──────────
  console.log('\nFetching live roster for in-custody detail URLs...');
  let liveMap = {};
  try {
    const inmates = await fetchRoster();
    for (const i of inmates) {
      if (i.bookingNumber && i.detailUrl) liveMap[i.bookingNumber] = i.detailUrl;
    }
    console.log(`Got ${Object.keys(liveMap).length} live detail URLs.`);
  } catch (err) {
    console.warn('Roster fetch failed, continuing with inmateId fallback only:', err.message);
  }

  // ── Step 2: iterate and backfill ─────────────────────────────────────────
  let updated = 0;
  let failed  = 0;
  let skipped = 0;

  for (const entry of needsWork) {
    const bn = entry.bookingNumber;

    // Only backfill inmates that are still in the live roster.
    // The Kitsap site (incustody.kitsap.gov) only surfaces current inmates —
    // released entries have no valid detail URL we can construct.
    const detailUrl = liveMap[bn] || null;

    if (!detailUrl) {
      console.log(`  SKIP  ${bn} — not in live roster (released or too old)`);
      skipped++;
      continue;
    }

    console.log(`  Fetching ${bn} (${entry.name})...`);
    await delay(DELAY_MS);

    let detail = null;
    try {
      detail = await fetchDetail(detailUrl);
    } catch (err) {
      console.warn(`  ERROR ${bn}: ${err.message}`);
      failed++;
      continue;
    }

    if (!detail?.charges?.length) {
      console.log(`  EMPTY ${bn} — detail returned no charges`);
      failed++;
      continue;
    }

    // Merge addDesc by charge index (same order as original scrape)
    let anyUpdated = false;
    for (let i = 0; i < entry.charges.length; i++) {
      const fresh = detail.charges[i];
      if (fresh && !Object.prototype.hasOwnProperty.call(entry.charges[i], 'addDesc')) {
        entry.charges[i].addDesc = fresh.addDesc ?? null;
        anyUpdated = true;
      }
    }

    if (anyUpdated) {
      console.log(`  OK    ${bn} — addDesc merged`);
      updated++;
    } else {
      console.log(`  NOOP  ${bn} — charges didn't align`);
      skipped++;
    }
  }

  // ── Step 3: save ─────────────────────────────────────────────────────────
  if (updated > 0) {
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
    console.log(`\nSaved. Updated ${updated}, failed ${failed}, skipped ${skipped}.`);
  } else {
    console.log(`\nNo changes written. Failed ${failed}, skipped ${skipped}.`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
