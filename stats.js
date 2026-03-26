// stats.js
// All aggregation functions. Take the raw log array (change_log.json entries)
// and return structured stat objects ready to serve as JSON.

import { normalizeCharge, normalizeRace, normalizeSex } from './chargeMap.js';
import { normalizeReleaseReason } from './releaseReasonMap.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function topN(countMap, n = 10) {
  return Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

function countBy(arr, keyFn) {
  const map = {};
  arr.forEach(item => {
    const k = keyFn(item) || 'Unknown';
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

function stayDays(entry) {
  if (!entry.firstSeen || !entry.releasedAt) return null;
  const ms = new Date(entry.releasedAt) - new Date(entry.firstSeen);
  if (isNaN(ms) || ms < 0) return null;
  return ms / (1000 * 60 * 60 * 24);
}

// ─── Basic Stats ──────────────────────────────────────────────────────────────

/**
 * Total bookings, status breakdown, and simple demographic counts.
 */
export function getBookingCounts(log) {
  const total = log.length;
  const inCustody = log.filter(e => e.status === 'in_custody').length;
  const released = log.filter(e => e.status === 'released').length;

  return { total, inCustody, released };
}

/**
 * Bookings grouped by gender.
 */
export function getGenderBreakdown(log) {
  const counts = countBy(log, e => normalizeSex(e.sex));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, pct: +((count / log.length) * 100).toFixed(1) }));
}

/**
 * Bookings grouped by race.
 */
export function getRaceBreakdown(log) {
  const counts = countBy(log, e => normalizeRace(e.race));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, pct: +((count / log.length) * 100).toFixed(1) }));
}

/**
 * Age distribution: mean, median, min, max, and histogram buckets.
 */
export function getAgeStats(log) {
  const ages = log
    .map(e => parseInt(e.age))
    .filter(a => !isNaN(a) && a > 0 && a < 120);

  if (!ages.length) return null;

  const buckets = {
    '18–25': 0,
    '26–35': 0,
    '36–45': 0,
    '46–55': 0,
    '56–65': 0,
    '65+':   0,
  };
  ages.forEach(a => {
    if (a <= 25)      buckets['18–25']++;
    else if (a <= 35) buckets['26–35']++;
    else if (a <= 45) buckets['36–45']++;
    else if (a <= 55) buckets['46–55']++;
    else if (a <= 65) buckets['56–65']++;
    else              buckets['65+']++;
  });

  return {
    mean: +mean(ages).toFixed(1),
    median: median(ages),
    min: Math.min(...ages),
    max: Math.max(...ages),
    histogram: Object.entries(buckets).map(([label, count]) => ({ label, count })),
  };
}

/**
 * Top charge categories by booking count (a booking can contribute multiple charges).
 * Returns top N categories.
 */
export function getTopCharges(log, n = 15) {
  const counts = {};
  log.forEach(entry => {
    const seen = new Set(); // dedupe per booking so one booking = one count per category
    (entry.charges || []).forEach(c => {
      const cat = normalizeCharge(c.violation);
      if (!seen.has(cat)) {
        counts[cat] = (counts[cat] || 0) + 1;
        seen.add(cat);
      }
    });
  });
  return topN(counts, n);
}

/**
 * Top arresting agencies.
 */
export function getTopAgencies(log, n = 10) {
  const counts = {};
  log.forEach(entry => {
    (entry.charges || []).forEach(c => {
      if (c.arrestAgency) {
        const agency = c.arrestAgency.trim();
        counts[agency] = (counts[agency] || 0) + 1;
      }
    });
  });
  return topN(counts, n);
}

/**
 * Bail / bond amount statistics.
 * Returns null if no data available.
 */
export function getBailStats(log) {
  const amounts = [];
  log.forEach(entry => {
    (entry.charges || []).forEach(c => {
      const b = parseFloat(c.bondAmount);
      if (!isNaN(b) && b > 0) amounts.push(b);
      const cash = parseFloat(c.cashAmount);
      if (!isNaN(cash) && cash > 0) amounts.push(cash);
    });
  });

  if (!amounts.length) return null;

  return {
    mean: +mean(amounts).toFixed(2),
    median: +median(amounts).toFixed(2),
    min: Math.min(...amounts),
    max: Math.max(...amounts),
    count: amounts.length,
  };
}

/**
 * Length-of-stay statistics (days), for released bookings only.
 */
export function getStayStats(log) {
  const stays = log
    .filter(e => e.status === 'released')
    .map(stayDays)
    .filter(d => d !== null);

  if (!stays.length) return null;

  // Histogram buckets
  const buckets = {
    '< 1 day':    0,
    '1–3 days':   0,
    '4–7 days':   0,
    '1–2 weeks':  0,
    '2–4 weeks':  0,
    '1–3 months': 0,
    '3+ months':  0,
  };
  stays.forEach(d => {
    if (d < 1)        buckets['< 1 day']++;
    else if (d <= 3)  buckets['1–3 days']++;
    else if (d <= 7)  buckets['4–7 days']++;
    else if (d <= 14) buckets['1–2 weeks']++;
    else if (d <= 30) buckets['2–4 weeks']++;
    else if (d <= 90) buckets['1–3 months']++;
    else              buckets['3+ months']++;
  });

  return {
    mean: +mean(stays).toFixed(1),
    median: +median(stays).toFixed(1),
    min: +Math.min(...stays).toFixed(1),
    max: +Math.max(...stays).toFixed(1),
    count: stays.length,
    histogram: Object.entries(buckets).map(([label, count]) => ({ label, count })),
  };
}

// ─── Deep Stats ───────────────────────────────────────────────────────────────

/**
 * Median bail amount by charge category.
 * Returns array of { category, medianBail, count } sorted by medianBail desc.
 */
export function getBailByCharge(log) {
  const byCategory = {};
  log.forEach(entry => {
    (entry.charges || []).forEach(c => {
      const cat = normalizeCharge(c.violation);
      const b = parseFloat(c.bondAmount) || parseFloat(c.cashAmount);
      if (!isNaN(b) && b > 0) {
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(b);
      }
    });
  });

  return Object.entries(byCategory)
    .map(([category, amounts]) => ({
      category,
      medianBail: +median(amounts).toFixed(2),
      meanBail: +mean(amounts).toFixed(2),
      count: amounts.length,
    }))
    .sort((a, b) => b.medianBail - a.medianBail);
}

/**
 * Charge category breakdown by race.
 * Returns { race: { category: count } } — useful for grouped bar charts.
 */
export function getChargesByRace(log) {
  const result = {};
  log.forEach(entry => {
    const race = normalizeRace(entry.race);
    if (!result[race]) result[race] = {};
    const seen = new Set();
    (entry.charges || []).forEach(c => {
      const cat = normalizeCharge(c.violation);
      if (!seen.has(cat)) {
        result[race][cat] = (result[race][cat] || 0) + 1;
        seen.add(cat);
      }
    });
  });
  return result;
}

/**
 * Charge category breakdown by sex.
 */
export function getChargesBySex(log) {
  const result = {};
  log.forEach(entry => {
    const sex = normalizeSex(entry.sex);
    if (!result[sex]) result[sex] = {};
    const seen = new Set();
    (entry.charges || []).forEach(c => {
      const cat = normalizeCharge(c.violation);
      if (!seen.has(cat)) {
        result[sex][cat] = (result[sex][cat] || 0) + 1;
        seen.add(cat);
      }
    });
  });
  return result;
}

/**
 * Release reason breakdown for all released bookings.
 */
export function getReleaseReasonBreakdown(log) {
  const released = log.filter(e => e.status === 'released');
  const counts = countBy(released, e => normalizeReleaseReason(e));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

/**
 * Recidivism: individuals booked more than once (matched by normalized name).
 * Returns { rate, repeatBookers: [{ name, count, bookings }] }
 */
export function getRecidivism(log) {
  const byName = {};
  log.forEach(entry => {
    const name = (entry.name || '').trim().toUpperCase();
    if (!name) return;
    if (!byName[name]) byName[name] = [];
    byName[name].push({
      bookingNumber: entry.bookingNumber,
      firstSeen: entry.firstSeen,
      status: entry.status,
    });
  });

  const repeats = Object.entries(byName)
    .filter(([, bookings]) => {
      // Only count as recidivism if there are multiple distinct booking numbers
      const uniqueBns = new Set(bookings.map(b => b.bookingNumber));
      return uniqueBns.size > 1;
    })
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, bookings]) => ({ name, count: bookings.length, bookings }));

  const totalIndividuals = Object.keys(byName).length;
  const rate = totalIndividuals > 0
    ? +((repeats.length / totalIndividuals) * 100).toFixed(1)
    : 0;

  return { rate, repeatBookerCount: repeats.length, totalIndividuals, repeatBookers: repeats.slice(0, 20) };
}

/**
 * Bookings over time, grouped by month (YYYY-MM).
 */
export function getBookingsByMonth(log) {
  const counts = {};
  log.forEach(entry => {
    if (!entry.firstSeen) return;
    const d = new Date(entry.firstSeen);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));
}

// ─── Master aggregation ───────────────────────────────────────────────────────

/**
 * Run all aggregations and return a single stats object.
 * @param {Array} log - the full change_log array
 */
export function buildStats(log) {
  // Dedupe by bookingNumber — keep the latest entry (first in the array,
  // since log is ordered newest-first). This prevents double-counting when
  // the scraper re-adds existing bookings after a server restart.
  const seen = new Set();
  log = log.filter(e => {
    if (!e.bookingNumber || seen.has(e.bookingNumber)) return false;
    seen.add(e.bookingNumber);
    return true;
  });

  return {
    generatedAt: new Date().toISOString(),
    bookingCounts: getBookingCounts(log),
    gender: getGenderBreakdown(log),
    race: getRaceBreakdown(log),
    age: getAgeStats(log),
    topCharges: getTopCharges(log, 15),
    topAgencies: getTopAgencies(log, 10),
    bail: getBailStats(log),
    stay: getStayStats(log),
    // deep
    bailByCharge: getBailByCharge(log),
    chargesByRace: getChargesByRace(log),
    chargesBySex: getChargesBySex(log),
    releaseReasons: getReleaseReasonBreakdown(log),
    recidivism: getRecidivism(log),
    bookingsByMonth: getBookingsByMonth(log),
  };
}
