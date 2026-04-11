import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary:   '#5B7FA6',
  secondary: '#415A77',
  accent:    '#7AA8C4',
  muted:     '#7A8A96',
  text:      '#D8D9D5',
  grid:      '#404850',
  green:     '#4A8A6A',
}
const TYPE_COLORS = {
  'Violent':             '#C0535A',
  'Property':            '#7AA8C4',
  'Drug':                '#4A8A6A',
  'Traffic / DUI':       '#5B7FA6',
  'Court / Supervision': '#8A6AA8',
  'Sex Offense':         '#A06878',
  'Weapons':             '#C08A45',
  'Fraud / Identity':    '#4A8A8A',
  'Order Violations':    '#6A8A5A',
  'Other':               '#5A6A72',
  'Unknown':             '#484E54',
}
const SEV_COLORS = { 'Felony': '#C0535A', 'Gross Misdemeanor': '#C08A45', 'Misdemeanor': '#5B7FA6', 'Unknown': '#484E54' }
const KNOWN_AGENCIES = ['Kitsap County Sheriff', 'Bremerton PD', 'Poulsbo PD', 'Port Orchard PD', 'Gig Harbor PD', 'Suquamish Tribal Police', 'DOC']

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt$(n) { return n != null ? `$${Number(n).toLocaleString()}` : '—' }
function fmtN(n) { return n != null ? Number(n).toLocaleString() : '—' }

function SectionTitle({ children }) {
  return <h3 className="stats-section-title">{children}</h3>
}
function NoData({ msg = 'Insufficient data — check back as records accumulate.' }) {
  return <div className="stats-nodata">{msg}</div>
}
function DarkTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="stats-tooltip">
      <div className="stats-tooltip-label">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="stats-tooltip-val">
          {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  )
}

function HBar({ data, dataKey = 'count', nameKey = 'label', colorFn, color = C.rust, height }) {
  if (!data?.length) return <NoData />
  const h = height || Math.max(200, data.length * 30)
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey={nameKey} width={210}
          tick={{ fill: C.text, fontSize: 11, fontFamily: 'Inter, sans-serif' }}
          axisLine={false} tickLine={false} />
        <Tooltip content={<DarkTip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey={dataKey} fill={color} radius={[0, 2, 2, 0]} maxBarSize={18}>
          {colorFn && data.map((d, i) => <Cell key={i} fill={colorFn(d)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function VBar({ data, dataKey = 'count', nameKey = 'label', color = C.rust, colorFn }) {
  if (!data?.length) return <NoData />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey={nameKey}
          tick={{ fill: C.text, fontSize: 10, fontFamily: 'Inter, sans-serif' }}
          axisLine={false} tickLine={false} angle={-28} textAnchor="end" interval={0} />
        <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<DarkTip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} maxBarSize={44}>
          {colorFn && data.map((d, i) => <Cell key={i} fill={colorFn(d)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DeepStats() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [trendTab, setTrendTab] = useState('month')   // 'month' | 'year'
  const [profileSex, setProfileSex] = useState(null)  // set after data loads
  const [showAllProfile, setShowAllProfile] = useState(false)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(d => {
        setData(d)
        setLoading(false)
        // default profile tab to first sex available
        const sexes = Object.keys(d.physicalProfile || {})
        if (sexes.length) setProfileSex(sexes[0])
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="stats-page"><div className="loading">Crunching deep numbers…</div></div>
  if (error)   return <div className="stats-page"><div className="stats-nodata">Error: {error}</div></div>

  const {
    bookingCounts, stay, bail, bailOnRelease, bailByCharge,
    crimeTypes, severity, avgCharges, topCharges,
    agencyBreakdown, stayByCharge,
    chargesBySex, chargesByRace, chargesByAgeGroup,
    physicalProfile, recidivism,
    bookingsByMonth, bookingsByYear,
    releaseReasons, generatedAt,
  } = data

  const profileRows = profileSex ? (physicalProfile?.[profileSex] || []) : []
  const profileDisplay = showAllProfile ? profileRows : profileRows.slice(0, 12)

  return (
    <div className="stats-page">

      {/* ── Header ── */}
      <div className="stats-header">
        <div className="back-links">
          <Link to="/" className="back-link">← Main Page</Link>
          <Link to="/stats" className="back-link">Stats</Link>
          <Link to="/released" className="back-link">Released</Link>
          <Link to="/" className="back-link">In Custody</Link>
        </div>
        <h2>Deep Stats</h2>
        <p className="stats-subtitle">
          {bookingCounts?.total?.toLocaleString()} total bookings tracked
          {generatedAt && <> &middot; {new Date(generatedAt).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT</>}
        </p>
      </div>

      {/* ── Section nav ── */}
      <div className="deep-nav">
        {['Summary','Trends','Crime Types','Bail & Release','Agencies','Detention','Demographics','Physical Profile','Recidivism'].map(s => (
          <a key={s} href={`#ds-${s.toLowerCase().replace(/[^a-z]/g,'-')}`} className="deep-nav-link">{s}</a>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 1 · SUMMARY                                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div id="ds-summary" className="ds-anchor" />
      <div className="stats-card">
        <SectionTitle>Summary</SectionTitle>
        <div className="stat-boxes">
          <div className="stat-box">
            <div className="stat-box-num">{fmtN(bookingCounts?.total)}</div>
            <div className="stat-box-label">Total Bookings</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-num">{fmtN(bookingCounts?.inCustody)}</div>
            <div className="stat-box-label">In Custody</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-num">{fmtN(bookingCounts?.released)}</div>
            <div className="stat-box-label">Releases Tracked</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-num">{stay?.mean ?? '—'}</div>
            <div className="stat-box-label">Avg Stay (days)</div>
            <div className="stat-box-sub">median {stay?.median ?? '—'}d</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-num">{avgCharges?.mean ?? '—'}</div>
            <div className="stat-box-label">Avg Charges / Inmate</div>
            <div className="stat-box-sub">median {avgCharges?.median ?? '—'}, max {avgCharges?.max ?? '—'}</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-num">{bailOnRelease?.pct ?? '—'}%</div>
            <div className="stat-box-label">Released w/ Bail Set</div>
            <div className="stat-box-sub">{fmtN(bailOnRelease?.withBail)} of {fmtN(bailOnRelease?.total)}</div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 2 · POPULATION TRENDS                                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div id="ds-trends" className="ds-anchor" />
      <div className="stats-card">
        <SectionTitle>Population Trends</SectionTitle>
        <div className="deep-tabs">
          <button className={trendTab === 'month' ? 'active' : ''} onClick={() => setTrendTab('month')}>Monthly</button>
          <button className={trendTab === 'year' ? 'active' : ''} onClick={() => setTrendTab('year')}>Yearly</button>
        </div>
        {trendTab === 'month'
          ? <VBar data={bookingsByMonth} nameKey="month" color={C.primary} />
          : <VBar data={bookingsByYear} nameKey="year" color={C.secondary} />
        }
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 3 · CRIME TYPES + SEVERITY                                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div id="ds-crime-types" className="ds-anchor" />
      <div className="stats-grid-2">
        <div className="stats-card">
          <SectionTitle>Crime Types</SectionTitle>
          <p className="stats-card-note">Broad category per booking (deduped). One booking can appear in multiple types.</p>
          <HBar data={crimeTypes} colorFn={d => TYPE_COLORS[d.label] || C.muted} height={Math.max(180, (crimeTypes?.length || 0) * 30)} />
          <table className="stats-table" style={{ marginTop: '0.75rem' }}>
            <tbody>
              {crimeTypes?.map(r => (
                <tr key={r.label}>
                  <td><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background: TYPE_COLORS[r.label] || C.muted, marginRight:6 }} />{r.label}</td>
                  <td className="stats-table-num">{r.count}</td>
                  <td className="stats-table-pct">{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stats-card">
          <SectionTitle>Charge Severity</SectionTitle>
          <p className="stats-card-note">Best-effort classification per individual charge instance (WA state tiers).</p>
          <HBar data={severity} colorFn={d => SEV_COLORS[d.label] || C.muted} height={160} />
          <table className="stats-table" style={{ marginTop: '0.75rem' }}>
            <tbody>
              {severity?.map(r => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td className="stats-table-num">{r.count}</td>
                  <td className="stats-table-pct">{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Most common offenses */}
      <div className="stats-card">
        <SectionTitle>Most Common Offenses</SectionTitle>
        <HBar data={topCharges} color={C.primary} />
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 4 · BAIL & RELEASE                                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div id="ds-bail---release" className="ds-anchor" />
      <div className="stats-card">
        <SectionTitle>Bail &amp; Release</SectionTitle>
        {bail && (
          <div className="stats-age-meta" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span>Median bail {fmt$(bail.median)}</span>
            <span>Mean {fmt$(bail.mean)}</span>
            <span>Max {fmt$(bail.max)}</span>
            <span>{fmtN(bail.count)} charges w/ bail</span>
            <span>{bailOnRelease?.pct}% of releases had bail set</span>
          </div>
        )}
        <p className="stats-card-note">Median bail amount by charge category (top 15).</p>
        {(() => {
          const d = bailByCharge?.slice(0, 15).map(r => ({ ...r, label: r.category }))
          if (!d?.length) return <NoData />
          return (
            <>
              <HBar data={d} dataKey="medianBail" nameKey="label" color={C.green}
                height={Math.max(200, d.length * 30)} />
              <table className="stats-table" style={{ marginTop: '0.75rem' }}>
                <thead><tr>
                  <th>Charge Category</th>
                  <th style={{ textAlign: 'right' }}>Median Bail</th>
                  <th style={{ textAlign: 'right' }}>Mean Bail</th>
                  <th style={{ textAlign: 'right' }}>n</th>
                </tr></thead>
                <tbody>
                  {d.map(r => (
                    <tr key={r.category}>
                      <td>{r.category}</td>
                      <td className="stats-table-num">{fmt$(r.medianBail)}</td>
                      <td className="stats-table-num">{fmt$(r.meanBail)}</td>
                      <td className="stats-table-num">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        })()}
      </div>

      <div className="stats-card">
        <SectionTitle>Release Reasons</SectionTitle>
        <p className="stats-card-note">Inferred from charge patterns for released bookings.</p>
        <VBar data={releaseReasons} color={C.accent} />
        <table className="stats-table" style={{ marginTop: '0.5rem' }}>
          <tbody>
            {releaseReasons?.map(r => (
              <tr key={r.label}><td>{r.label}</td><td className="stats-table-num">{r.count}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 5 · ARRESTING AGENCIES                                           */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div id="ds-agencies" className="ds-anchor" />
      <div className="stats-card">
        <SectionTitle>Arresting Agencies</SectionTitle>
        <p className="stats-card-note">Charge count per agency. One arrest can carry multiple charges.</p>
        {agencyBreakdown?.length
          ? <>
              <HBar data={agencyBreakdown.map(a => ({ label: a.name, count: a.count }))}
                color={C.secondary} height={Math.max(180, agencyBreakdown.length * 30)} />
              <div className="agency-grid">
                {agencyBreakdown.map(a => (
                  <div key={a.name} className={`agency-card ${KNOWN_AGENCIES.includes(a.name) ? 'agency-card-known' : ''}`}>
                    <div className="agency-name">{a.name}</div>
                    <div className="agency-count">{a.count.toLocaleString()} charges</div>
                    <div className="agency-top">Top: {a.topCharge}</div>
                    <ul className="agency-charges">
                      {a.chargeBreakdown.map(c => (
                        <li key={c.label}><span>{c.label}</span><span>{c.count}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          : <NoData />
        }
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 6 · DETENTION DURATION                                           */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div id="ds-detention" className="ds-anchor" />
      <div className="stats-card">
        <SectionTitle>Average Detention Duration by Charge Type</SectionTitle>
        <p className="stats-card-note">Released bookings only, ≥3 data points per category. Sorted by average days.</p>
        {stayByCharge?.length
          ? <>
              <HBar data={stayByCharge.map(r => ({ label: r.category, count: r.avgDays }))}
                dataKey="count" nameKey="label" color={C.accent}
                height={Math.max(200, stayByCharge.length * 30)} />
              <table className="stats-table" style={{ marginTop: '0.75rem' }}>
                <thead><tr>
                  <th>Charge Category</th>
                  <th style={{ textAlign: 'right' }}>Avg Days</th>
                  <th style={{ textAlign: 'right' }}>Median Days</th>
                  <th style={{ textAlign: 'right' }}>n</th>
                </tr></thead>
                <tbody>
                  {stayByCharge.map(r => (
                    <tr key={r.category}>
                      <td>{r.category}</td>
                      <td className="stats-table-num">{r.avgDays}</td>
                      <td className="stats-table-num">{r.medianDays}</td>
                      <td className="stats-table-num">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          : <NoData />
        }
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 7 · DEMOGRAPHICS                                                 */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div id="ds-demographics" className="ds-anchor" />

      {/* Charges by age group */}
      <div className="stats-card">
        <SectionTitle>Top Charges by Age Group</SectionTitle>
        <div className="age-group-grid">
          {chargesByAgeGroup?.map(({ group, topCharges: tc }) => (
            <div key={group} className="age-group-card">
              <div className="age-group-label">{group}</div>
              {tc.length
                ? <ol className="age-group-list">
                    {tc.map(c => <li key={c.label}><span>{c.label}</span><span>{c.count}</span></li>)}
                  </ol>
                : <div className="stats-nodata" style={{ padding: '0.5rem 0', fontSize: '0.7rem' }}>No data</div>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Charges by gender + race */}
      <div className="stats-grid-2">
        <div className="stats-card">
          <SectionTitle>Top Charges by Sex</SectionTitle>
          {Object.entries(chargesBySex || {}).map(([sex, charges]) => (
            <div key={sex} style={{ marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: C.accent, marginBottom: '0.3rem', fontSize: '0.85rem' }}>{sex}</div>
              <table className="stats-table">
                <tbody>
                  {Object.entries(charges).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([charge, count]) => (
                    <tr key={charge}><td>{charge}</td><td className="stats-table-num">{count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div className="stats-card">
          <SectionTitle>Top Charges by Race</SectionTitle>
          {Object.entries(chargesByRace || {}).map(([race, charges]) => (
            <div key={race} style={{ marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: C.accent, marginBottom: '0.3rem', fontSize: '0.85rem' }}>{race}</div>
              <table className="stats-table">
                <tbody>
                  {Object.entries(charges).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([charge, count]) => (
                    <tr key={charge}><td>{charge}</td><td className="stats-table-num">{count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 8 · PHYSICAL PROFILE                                             */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div id="ds-physical-profile" className="ds-anchor" />
      <div className="stats-card">
        <SectionTitle>Physical Profile by Charge</SectionTitle>
        <p className="stats-card-note">Average weight/height and most common race per charge, by sex. Requires ≥3 data points.</p>
        <div className="deep-tabs" style={{ marginBottom: '0.75rem' }}>
          {Object.keys(physicalProfile || {}).map(sex => (
            <button key={sex} className={profileSex === sex ? 'active' : ''} onClick={() => { setProfileSex(sex); setShowAllProfile(false) }}>{sex}</button>
          ))}
        </div>
        {profileRows.length
          ? <>
              <table className="stats-table">
                <thead><tr>
                  <th>Charge</th>
                  <th style={{ textAlign: 'right' }}>Avg Weight</th>
                  <th style={{ textAlign: 'right' }}>Avg Height</th>
                  <th>Top Race</th>
                  <th style={{ textAlign: 'right' }}>n</th>
                </tr></thead>
                <tbody>
                  {profileDisplay.map(r => (
                    <tr key={r.charge}>
                      <td>{r.charge}</td>
                      <td className="stats-table-num">{r.avgWeight ? `${r.avgWeight} lbs` : '—'}</td>
                      <td className="stats-table-num">{r.avgHeight || '—'}</td>
                      <td>{r.topRace || '—'}</td>
                      <td className="stats-table-num">{r.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {profileRows.length > 12 && (
                <button className="deep-show-more" onClick={() => setShowAllProfile(v => !v)}>
                  {showAllProfile ? '▲ Show less' : `▼ Show all ${profileRows.length} rows`}
                </button>
              )}
            </>
          : <NoData />
        }
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 9 · RECIDIVISM                                                   */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div id="ds-recidivism" className="ds-anchor" />
      <div className="stats-card">
        <SectionTitle>Repeat Bookers</SectionTitle>
        {recidivism && (
          <div className="stats-age-meta" style={{ marginBottom: '0.8rem', flexWrap: 'wrap' }}>
            <span>Repeat rate {recidivism.rate}%</span>
            <span>{recidivism.repeatBookerCount} repeat individuals</span>
            <span>{recidivism.totalIndividuals} unique individuals tracked</span>
          </div>
        )}
        <p className="stats-card-note">
          Full recidivism analysis (time between re-arrests, risk scoring) coming soon — requires a longer data history.
        </p>
        {recidivism?.repeatBookers?.length
          ? <table className="stats-table">
              <thead><tr>
                <th>Name</th>
                <th style={{ textAlign: 'right' }}>Bookings</th>
              </tr></thead>
              <tbody>
                {recidivism.repeatBookers.map(r => (
                  <tr key={r.name}><td>{r.name}</td><td className="stats-table-num">{r.count}</td></tr>
                ))}
              </tbody>
            </table>
          : <NoData msg="No repeat bookers detected yet." />
        }
      </div>

    </div>
  )
}
