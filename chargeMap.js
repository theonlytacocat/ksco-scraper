// chargeMap.js
// Pattern-based lookup table: maps raw violation strings → standardized charge categories.
// Patterns are checked in order; first match wins. New violations fall through to 'Other'.
// Each entry: [RegExp, category string]

export const CHARGE_PATTERNS = [

  // ── Domestic Violence ───────────────────────────────────────────────────────
  // DV modifier appears at the end of many charge descriptions. Catch it first
  // so DV assault / DV harassment / DV burglary all land here.
  [/\bDV\b/, 'Domestic Violence'],

  // ── Homicide ────────────────────────────────────────────────────────────────
  [/MURDER|HOMICIDE|VEHICULAR HOMICIDE/, 'Homicide'],

  // ── Sexual Offenses ─────────────────────────────────────────────────────────
  [/RAPE OF A CHILD|CHILD MOLESTATION|CHILD MOLEST/, 'Child Sex Offense'],
  [/DEPICTIONS OF A MINOR|SEXUALLY EXPLICIT CONDUCT|SEXUAL EXPLOITATION OF A MINOR/, 'Child Exploitation / CSAM'],
  [/RAPE|INDECENT LIBERTIES|VOYEURISM|COMMUNICATE W\/MINOR.*IMMORAL|COMMERCIAL SEX ABUSE/, 'Sex Offense'],
  [/SEX OFFENDER.*FAIL TO REGISTER|FAIL TO REGISTER.*SEX OFFENDER/, 'Failure to Register (Sex Offender)'],
  [/INDECENT EXPOSURE/, 'Indecent Exposure'],
  [/DISCLOSING INTIMATE IMAGES/, 'Sex Offense'],
  [/TRAFFICKING.*(PERSON|HUMAN)|TRAFFICKING-[12]$|TRAFFICKING-[12]\s/, 'Human Trafficking'],

  // ── Assault (non-DV) ────────────────────────────────────────────────────────
  [/ASSAULT.*CHILD|ASSAULT OF A CHILD/, 'Assault (Child)'],
  [/CUSTODIAL ASSAULT/, 'Assault'],
  [/ASSAULT-?[1234]|ASSAULT [1234]|DRIVE.?BY SHOOTING|RECKLESS ENDANGERMENT/, 'Assault'],
  [/VEHICULAR ASSAULT/, 'Assault'],

  // ── Robbery ─────────────────────────────────────────────────────────────────
  [/ROBBERY-?[12]|ROBBERY [12]/, 'Robbery'],

  // ── Kidnapping / Unlawful Imprisonment ──────────────────────────────────────
  [/KIDNAPPING|UNLAWFUL IMPRISONMENT|CUSTODIAL INTERFERENCE/, 'Kidnapping / Unlawful Imprisonment'],

  // ── Drug Offenses ────────────────────────────────────────────────────────────
  [/CONTROLLED SUBSTANCE|CONTROL SUBSTANCE|CONT SUB/, 'Drug Offense'],
  [/LEGEND DRUG/, 'Drug Offense'],
  [/UNLAWFUL POSS.*DRUG|UNLAWFUL USE.*DRUG|POSS.*DRUG|MFG.*DRUG|DEL.*DRUG/, 'Drug Offense'],
  [/BUILDING.*UNLAWFUL.*DRUG|BLDG.*UNLAW.*DRUG/, 'Drug Offense'],
  [/PRACTITIONER DISPENSE/, 'Drug Offense'],
  [/MARIJUANA|CANNABIS/, 'Drug Offense'],

  // ── Weapons ──────────────────────────────────────────────────────────────────
  [/THEFT OF A FIREARM|POSSESSION STOLEN FIREARM|POSSESS STOLEN FIREARM/, 'Weapons'],
  [/FIREARM POSSESSION|POSSESS.*FIREARM|FIREARM.*UNLAWFUL/, 'Weapons'],
  [/DANGEROUS WEAPON|DISPLAYING WEAPON/, 'Weapons'],
  [/EXPLOSIVE|FIREWORKS.*DISCHRG/, 'Weapons'],

  // ── DUI / Traffic ─────────────────────────────────────────────────────────────
  [/DRIVING UNDER THE INFLUENCE|DUI/, 'DUI'],
  [/DWLS [123]|DRIVE W\/LICENSE SUSP|HABITUAL TRAFFIC OFFENDER/, 'Driving While License Suspended'],
  [/ATTEMPT TO ELUDE|ELUDE/, 'Attempt to Elude'],
  [/HIT.?AND.?RUN|HIT\/RUN/, 'Hit and Run'],
  [/RECKLESS DRIVING/, 'Reckless Driving'],
  [/IGNITION INTERLOCK/, 'Ignition Interlock Violation'],
  [/FAILURE TO OBEY OFFICER|FAILURE TO OBEY/, 'Traffic / Obstruction'],
  [/VEHICLE TRIP PERMITS|COMMERCIAL DRIVERS LICENSE|DRIVERS LICENSE.*VIOLATION/, 'Traffic Violation'],
  [/THEFT OF MOTOR VEHICLE FUEL/, 'Theft'],

  // ── Warrants / Holds ─────────────────────────────────────────────────────────
  [/DEPARTMENT OF CORRECTIONS WARRANT|DOCWT/, 'DOC Warrant'],
  [/FUGITIVE FROM JUSTICE/, 'Fugitive from Justice'],
  [/ORDER OF PRODUCTION/, 'Court Hold'],

  // ── Court / Probation / Supervision ──────────────────────────────────────────
  [/FAILURE TO APPEAR|CONTEMPT OF COURT/, 'Failure to Appear'],
  [/PROBATION VIOLATION/, 'Probation Violation'],
  [/VIOLATION OF COMMUNITY CUSTODY|COMMUNITY CUSTODY VIOLATOR|COMMUNITY CUSTODY/, 'Community Custody Violation'],
  [/FAILURE TO COMPLY.*SENTENCE|FAIL TO COMPLY.*SENTENCE/, 'Failure to Comply (Sentence)'],
  [/REVOCATION OF PR\/BAIL|PR REVOKE|REVOCATION.*PR|REVOCATION.*BAIL/, 'PR / Bail Revocation'],

  // ── Property Crime ────────────────────────────────────────────────────────────
  [/BURGLARY-?1|BURGLARY [1]/, 'Burglary (1st Degree)'],
  [/RESIDENTIAL BURGLARY/, 'Residential Burglary'],
  [/BURGLARY-?2|BURGLARY [2]/, 'Burglary (2nd Degree)'],
  [/POSSESS BURGLARY TOOLS|VEHICLE THEFT TOOL/, 'Burglary Tools'],
  [/VEHICLE PROWLING/, 'Vehicle Prowling'],
  [/THEFT-?1|THEFT [1]/, 'Theft (1st Degree)'],
  [/THEFT-?2|THEFT [2]|THEFT.?ORGANIZED RETAIL/, 'Theft (2nd Degree)'],
  [/THEFT-?3|THEFT [3]/, 'Theft (3rd Degree)'],
  [/THEFT OF A MOTOR VEHICLE|VEHICLE THEFT/, 'Motor Vehicle Theft'],
  [/POSSESSION OF A STOLEN VEHICLE|STOLEN VEHICLE/, 'Possession of Stolen Vehicle'],
  [/TAKE MTR VEH W\/O PERMISSION/, 'Motor Vehicle Theft'],
  [/POSSESS STOLEN PROPERTY-?1|STOLEN PROPERTY [1]/, 'Possession of Stolen Property'],
  [/POSSESS STOLEN PROPERTY-?2|STOLEN PROPERTY [2]/, 'Possession of Stolen Property'],
  [/TRAFFICKING STOLEN PROPERTY/, 'Trafficking Stolen Property'],
  [/ARSON/, 'Arson'],
  [/MALICIOUS MISCHIEF/, 'Malicious Mischief'],

  // ── Trespass ──────────────────────────────────────────────────────────────────
  [/CRIMINAL TRESPASS-?[12]|TRESPASS-? [12]/, 'Criminal Trespass'],
  [/UNAUTHORIZED CAMPING/, 'Criminal Trespass'],

  // ── Harassment / Stalking / Protection Orders ─────────────────────────────────
  [/PROTECTION ORDER VIOLATION|PROTECTION ORDER VIO/, 'Protection Order Violation'],
  [/STALKING/, 'Stalking'],
  [/HARASSMENT|THREATENING/, 'Harassment'],
  [/RESTRICTING CONTACT ORDER/, 'Protection Order Violation'],
  [/INTERFERENCE.*DOMESTIC VIOL|INTERFERE.*DV/, 'Interference with DV Reporting'],

  // ── Identity / Fraud / Financial ──────────────────────────────────────────────
  [/IDENTITY THEFT/, 'Identity Theft'],
  [/FORGERY/, 'Forgery'],
  [/CRIMINAL IMPERSONATION/, 'Criminal Impersonation'],
  [/POSSESSION OF ANOTHERS IDENTIFICATION/, 'Identity Theft'],
  [/MAKE FALSE.*MISLEADING|FALSE.*STATEMENT/, 'Making False Statements'],
  [/BRIBERY/, 'Bribery'],

  // ── Obstruction / Witness Tampering ──────────────────────────────────────────
  [/INTIMIDATING WITNESS|TAMPER.*WITNESS|WITNESS/, 'Witness Tampering'],
  [/TAMPER.*PHYSICAL EVIDENCE/, 'Tampering with Evidence'],
  [/OBSTRUCT LAW ENFORCEMENT|OBSTRUCT/, 'Obstruction'],
  [/RESISTING ARREST/, 'Resisting Arrest'],

  // ── Other Specific ────────────────────────────────────────────────────────────
  [/INCEST/, 'Incest'],
  [/INDECENT TRANSIT CONDUCT|TRANSIT CONDUCT/, 'Public Order'],
  [/UNLAWFUL TRANSIT CONDUCT/, 'Public Order'],

  // ── Tribal / Local Code ───────────────────────────────────────────────────────
  [/^PGTC|^STC |^BMC/, 'Local / Tribal Code'],
];

const RACE_LABELS = {
  W: 'White',
  B: 'Black',
  H: 'Hispanic',
  I: 'Native American',
  A: 'Asian / Pacific Islander',
  U: 'Unknown',
  O: 'Other',
};

const SEX_LABELS = {
  M: 'Male',
  F: 'Female',
  U: 'Unknown',
};

/**
 * Normalize a raw violation string to a standardized charge category.
 * Strips "(Cleared)" suffix before matching.
 */
export function normalizeCharge(rawViolation) {
  if (!rawViolation) return 'Unknown';
  const v = rawViolation.replace(/\s*\(Cleared\)\s*$/i, '').toUpperCase().trim();
  for (const [pattern, category] of CHARGE_PATTERNS) {
    if (pattern.test(v)) return category;
  }
  return 'Other';
}

/**
 * Expand short race code to display label.
 */
export function normalizeRace(code) {
  if (!code) return 'Unknown';
  return RACE_LABELS[code.toUpperCase()] || code;
}

/**
 * Expand short sex code to display label.
 */
export function normalizeSex(code) {
  if (!code) return 'Unknown';
  return SEX_LABELS[code.toUpperCase()] || code;
}
