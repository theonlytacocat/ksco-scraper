import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cron from 'node-cron';
import { fetchRoster, fetchDetail } from './scrapers/kitsap.js';
import { nowPST } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, 'data');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const ROSTER_FILE  = path.join(STORAGE_DIR, 'roster.json');
const LOG_FILE     = path.join(STORAGE_DIR, 'change_log.json');
const METRICS_FILE = path.join(STORAGE_DIR, 'metrics.json');

function readJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {}
  return fallback;
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let scrapeRunning = false;

async function runScrape() {
  if (scrapeRunning) {
    console.log('Scrape already running, skipping.');
    return;
  }
  scrapeRunning = true;
  try {
    console.log(`[${nowPST()}] Running scrape...`);

    let roster = readJSON(ROSTER_FILE, {});
    let log = readJSON(LOG_FILE, []);

    let inmates;
    try {
      inmates = await fetchRoster();
    } catch (err) {
      console.error('Roster fetch failed:', err.message);
      return;
    }

    if (inmates.length === 0) {
      console.log('Got 0 inmates — skipping diff to avoid wiping data.');
      return;
    }

    const currentIds = new Set(inmates.map(i => i.bookingNumber));
    const previousIds = new Set(Object.keys(roster));

    const newBookings = inmates.filter(i => !previousIds.has(i.bookingNumber));
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
    for (const id of released) {
      const inmate = roster[id];
      console.log(`  RELEASED: ${inmate.lastName}, ${inmate.firstName}`);
      const releasedAt = nowPST();
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
  } finally {
    scrapeRunning = false;
  }
}

cron.schedule('0 * * * *', runScrape);

app.get('/api/status', (req, res) => {
  const roster = readJSON(ROSTER_FILE, {});
  const metrics = readJSON(METRICS_FILE, { views: 0 });
  metrics.views = (metrics.views || 0) + 1;
  writeJSON(METRICS_FILE, metrics);
  const inCustody = Object.values(roster).filter(i => i.status === 'in_custody').length;
  res.json({
    inCustody,
    totalTracked: readJSON(LOG_FILE, []).length,
    lastUpdated: nowPST(),
    views: metrics.views
  });
});

app.get('/api/log', (req, res) => {
  res.json(readJSON(LOG_FILE, []));
});

app.get('/api/inmate/:bookingNumber', (req, res) => {
  const roster = readJSON(ROSTER_FILE, {});
  const inmate = roster[req.params.bookingNumber];
  if (!inmate) return res.status(404).json({ error: 'Not found' });
  res.json(inmate);
});

app.get('/api/run', async (req, res) => {
  res.json({ message: 'Scrape started' });
  await runScrape();
});

// Serve frontend
const frontendDist = process.env.NODE_ENV === 'production' && process.env.STORAGE_DIR
  ? path.join(process.env.STORAGE_DIR, 'frontend', 'dist')
  : path.join(__dirname, 'frontend', 'dist');

// Fallback to local dist if STORAGE_DIR doesn't have the files
const fsExists = fs.existsSync(path.join(frontendDist, 'index.html'));
const actualFrontendDist = fsExists ? frontendDist : path.join(__dirname, 'frontend', 'dist');

console.log(`[${nowPST()}] Serving frontend from: ${actualFrontendDist}`);
app.use(express.static(actualFrontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(actualFrontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[${nowPST()}] Kitsap Jail Roster running on port ${PORT}`);
  runScrape();
});