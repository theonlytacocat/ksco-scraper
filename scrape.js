import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { fetchRoster, fetchDetail, fetchRecentReleases } from './scrapers/kitsap.js';
import { nowPST } from './utils.js';
import { buildStats } from './stats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const ROSTER_FILE  = path.join(STORAGE_DIR, 'roster.json');
const LOG_FILE     = path.join(STORAGE_DIR, 'change_log.json');
const STATS_FILE   = path.join(STORAGE_DIR, 'stats.json');
const STATUS_FILE  = path.join(STORAGE_DIR, 'status.json');

function readJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {}
  return fallback;
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function run() {
  console.log(`[${nowPST()}] Running scrape...`);

  let roster = readJSON(ROSTER_FILE, {});
  let log = readJSON(LOG_FILE, []);

  let inmates;
  try {
    inmates = await fetchRoster();
  } catch (err) {
    console.error('Roster fetch failed:', err.message);
    process.exit(1);
  }

  if (inmates.length === 0) {
    console.log('Got 0 inmates — skipping diff to avoid wiping data.');
  } else {
    const seenBns = new Set();
    const uniqueInmates = inmates.filter(i =>
      i.bookingNumber && !seenBns.has(i.bookingNumber) && seenBns.add(i.bookingNumber)
    );

    const currentIds = new Set(uniqueInmates.map(i => i.bookingNumber));
    const previousIds = new Set(Object.keys(roster));

    const newBookings = uniqueInmates.filter(i => !previousIds.has(i.bookingNumber));
    for (const inmate of newBookings) {
      console.log(`  NEW: ${inmate.lastName}, ${inmate.firstName}`);

      let detail = null;
      if (inmate.detailUrl) {
        detail = await fetchDetail(inmate.detailUrl);
      }

      const entry = {
        ...inmate,
        ...(detail || {}),
        status: 'in_custody',
        firstSeen: nowPST(),
        releasedAt: null
      };

      roster[inmate.bookingNumber] = entry;

      log.unshift({
        type: 'BOOKED',
        bookingNumber: inmate.bookingNumber,
        name: `${inmate.lastName}, ${inmate.firstName} ${inmate.middleName}`.trim(),
        bookingDate: inmate.bookingDate,
        charges: detail?.charges || [],
        age: detail?.age || null,
        sex: inmate.sex,
        race: inmate.race,
        height: detail?.height || null,
        weight: detail?.weight || null,
        hair: detail?.hair || null,
        eyes: detail?.eyes || null,
        inmateId: detail?.inmateId || null,
        schedRelease: detail?.schedRelease || inmate.schReleaseDate || null,
        firstSeen: nowPST(),
        releasedAt: null,
        status: 'in_custody'
      });
    }

    const released = [...previousIds].filter(id => !currentIds.has(id) && roster[id]?.status === 'in_custody');

    let recentReleases = {};
    if (released.length > 0) {
      recentReleases = await fetchRecentReleases();
    }

    for (const id of released) {
      const inmate = roster[id];
      console.log(`  RELEASED: ${inmate.lastName}, ${inmate.firstName}`);
      const releasedAt = recentReleases[id] || nowPST();
      roster[id].status = 'released';
      roster[id].releasedAt = releasedAt;
      const logEntry = log.find(e => e.bookingNumber === id);
      if (logEntry) {
        logEntry.status = 'released';
        logEntry.releasedAt = releasedAt;
      }
    }

    writeJSON(ROSTER_FILE, roster);
    writeJSON(LOG_FILE, log);
    console.log(`[${nowPST()}] Done. ${newBookings.length} new, ${released.length} released.`);
  }

  // Write precomputed stats and status for static frontend
  const inCustody = Object.values(roster).filter(i => i.status === 'in_custody').length;
  writeJSON(STATUS_FILE, { inCustody, lastUpdated: nowPST() });
  writeJSON(STATS_FILE, buildStats(log));
  console.log(`[${nowPST()}] Wrote stats.json and status.json`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
