// releaseReasonMap.js
// Lookup table + inference logic for why a booking was released.
// The jail roster doesn't include an explicit release reason field, so we infer
// from charge patterns and scheduling data.

// Priority-ordered patterns: [RegExp against violation text, reason label]
export const RELEASE_REASON_PATTERNS = [
  // Holds that resolve when the underlying issue is handled
  [/DEPARTMENT OF CORRECTIONS WARRANT|DOCWT/, 'DOC Transfer / Detainer'],
  [/FUGITIVE FROM JUSTICE/, 'Extradition'],
  [/ORDER OF PRODUCTION/, 'Court Production Order'],

  // PR/bail revocations and compliance failures
  [/REVOCATION OF PR\/BAIL|PR REVOKE|REVOCATION.*BAIL/, 'PR / Bail Revoked'],
  [/FAILURE TO COMPLY.*SENTENCE|FAIL TO COMPLY.*SENTENCE/, 'Failure to Comply'],

  // Court-related releases
  [/FAILURE TO APPEAR|CONTEMPT OF COURT/, 'FTA / Contempt Resolved'],

  // Supervision violations
  [/VIOLATION OF COMMUNITY CUSTODY|COMMUNITY CUSTODY VIOLATOR/, 'Community Custody Revocation'],
  [/PROBATION VIOLATION/, 'Probation Revocation'],
];

/**
 * Infer why a booking was released.
 *
 * @param {object} entry - booking log entry
 * @param {string[]} entry.charges - array of charge objects (each has .violation)
 * @param {string|null} entry.schedRelease - scheduled release date string
 * @param {string|null} entry.releasedAt - actual release timestamp
 * @returns {string} standardized release reason label
 */
export function normalizeReleaseReason(entry) {
  const charges = entry.charges || [];

  // Check each charge violation against patterns
  for (const charge of charges) {
    const v = (charge.violation || '').replace(/\s*\(Cleared\)\s*$/i, '').toUpperCase().trim();
    for (const [pattern, reason] of RELEASE_REASON_PATTERNS) {
      if (pattern.test(v)) return reason;
    }
  }

  // If a scheduled release date exists and is in the past relative to releasedAt,
  // it was likely a time-served / scheduled release
  if (entry.schedRelease && entry.releasedAt) {
    return 'Scheduled Release / Time Served';
  }

  // If the person had bail/bond charges that are now cleared, bond was likely posted
  const hasClearedBondCharge = charges.some(c =>
    /\(Cleared\)/i.test(c.violation || '') &&
    /(BAIL|BOND|PR REVOKE)/i.test(c.violation || '')
  );
  if (hasClearedBondCharge) return 'Bond Posted';

  // Generic fallback buckets based on primary charge category
  const primaryViolation = (charges[0]?.violation || '').toUpperCase();
  if (/WARRANT/.test(primaryViolation)) return 'Warrant Resolved';
  if (/FAILURE TO APPEAR|CONTEMPT/.test(primaryViolation)) return 'FTA / Contempt Resolved';
  if (/DUI|DRIVING UNDER/.test(primaryViolation)) return 'Released';
  if (/ASSAULT|HARASSMENT|STALKING/.test(primaryViolation)) return 'Released';

  return 'Released (Unknown Reason)';
}
