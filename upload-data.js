import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_URL = 'https://ksco-scraper-production.up.railway.app/api/upload-data';

// Read local data files
const rosterData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'roster.json'), 'utf-8'));
const logData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'change_log.json'), 'utf-8'));

console.log(`Local data: ${Object.keys(rosterData).length} roster entries, ${logData.length} log entries`);
console.log('Uploading to production...');

try {
  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      roster: rosterData,
      log: logData
    })
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Upload successful!');
    console.log(`   Roster: ${result.rosterCount} total entries`);
    console.log(`   Change log: ${result.logCount} total entries`);
  } else {
    console.error('❌ Upload failed:', result.error);
  }
} catch (err) {
  console.error('❌ Upload error:', err.message);
}
