import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const C = {
  rust:  '#8b4a1e',
  red:   '#c1440e',
  dark:  '#3d2b1a',
  tan:   '#c9b89e',
  muted: '#7a5c3e',
  bg:    '#ede6da',
  text:  '#2c1f14',
  grid:  '#d8cbb8',
  green: '#4a7a4a',
}

const RACE_COLORS = ['#8b4a1e','#c1440e','#5a8a4a','#4a6a8a','#8a4a7a','#6a8a4a']

function SectionTitle({ children }) {
  return <h3 className="stats-section-title">{children}</h3>
}

function NoData({ msg = 'Insufficient data — check back as records accumulate.' }) {
  return <div className="stats-nodata">{msg}</div>
}

function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="stats-tooltip">
      <div className="stats-tooltip-label">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="stats-tooltip-val">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  )
}

function HBar({ data, dataKey = 'count', nameKey = 'label', color = C.rust, height }) {
  if (!data?.length) return <NoData />
  const h = height || Math.max(220, data.length * 32)
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey={nameKey} width={200}
          tick={{ fill: C.text, fontSize: 12, fontFamily: 'Georgia, serif' }}
          axisLine={false} tickLine={false} />
        <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey={dataKey} fill={color} radius={[0, 2, 2, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function VBar({ data, dataKey = 'count', nameKey = 'label', colors, color = C.rust }) {
  if (!data?.length) return <NoData />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey={nameKey}
          tick={{ fill: C.text, fontSize: 11, fontFamily: 'Georgia, serif' }}
          axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} maxBarSize={50}>
          {colors && data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// For bail by charge: show median bail as horizontal bars with dollar labels
function BailBar({ data }) {
  if (!data?.length) return <NoData />
  const top = data.slice(0, 15)
  const h = Math.max(220, top.length * 32)
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={top} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="category" width={200}
          tick={{ fill: C.text, fontSize: 12, fontFamily: 'Georgia, serif' }}
          axisLine={false} tickLine={false} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload
            return (
              <div className="stats-tooltip">
                <div className="stats-tooltip-label">{label}</div>
                <div className="stats-tooltip-val">Median: ${d.medianBail?.toLocaleString()}</div>
                <div className="stats-tooltip-val">Mean: ${d.meanBail?.toLocaleString()}</div>
                <div className="stats-tooltip-val">Charges: {d.count}</div>
              </div>
            )
          }}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        <Bar dataKey="medianBail" fill={C.green} radius={[0, 2, 2, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Top charges per race as a small table
function ChargesByGroupTable({ data, groupKey = 'race' }) {
  if (!data || !Object.keys(data).length) return <NoData />
  return (
    <div style={{ overflowX: 'auto' }}>
      {Object.entries(data).map(([group, charges]) => {
        const top5 = Object.entries(charges)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
        return (
          <div key={group} style={{ marginBottom: '1.2rem' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontWeight: 600, color: C.rust, marginBottom: '0.3rem' }}>
              {group}
            </div>
            <table className="stats-table">
              <tbody>
                {top5.map(([charge, count]) => (
                  <tr key={charge}>
                    <td>{charge}</td>
                    <td className="stats-table-num">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

export default function DeepStats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="stats-page"><div className="loading">Crunching deep numbers...</div></div>
  if (error)   return <div className="stats-page"><div className="stats-nodata">Error: {error}</div></div>

  const { bailByCharge, chargesByRace, chargesBySex, releaseReasons, recidivism, topAgencies, bail, bookingCounts } = data

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h2>Deep Stats</h2>
        <p className="stats-subtitle">
          {bookingCounts?.total?.toLocaleString()} total bookings
          {data.generatedAt && (
            <> &middot; {new Date(data.generatedAt).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT</>
          )}
        </p>
      </div>

      {/* ── Top Arresting Agencies ─────────────────────────────────────────── */}
      <div className="stats-card">
        <SectionTitle>Top Arresting Agencies</SectionTitle>
        <p className="stats-card-note">Ranked by number of individual charges attributed to each agency.</p>
        <HBar data={topAgencies} color={C.dark} />
      </div>

      {/* ── Bail by Charge Category ────────────────────────────────────────── */}
      <div className="stats-card">
        <SectionTitle>Median Bail by Charge Category</SectionTitle>
        <p className="stats-card-note">Top 15 charge categories by median bail/bond amount set.</p>
        {bail && (
          <div className="stats-age-meta" style={{ marginBottom: '0.8rem' }}>
            <span>Overall median ${bail.median?.toLocaleString()}</span>
            <span>Mean ${bail.mean?.toLocaleString()}</span>
            <span>Max ${bail.max?.toLocaleString()}</span>
            <span>n={bail.count?.toLocaleString()}</span>
          </div>
        )}
        <BailBar data={bailByCharge} />
      </div>

      {/* ── Release Reasons ────────────────────────────────────────────────── */}
      <div className="stats-card">
        <SectionTitle>Release Reasons</SectionTitle>
        <p className="stats-card-note">Inferred from charge type for released bookings.</p>
        <VBar data={releaseReasons} color={C.muted} />
        <table className="stats-table" style={{ marginTop: '0.8rem' }}>
          <tbody>
            {releaseReasons?.map(r => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className="stats-table-num">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Charges by Race / Sex ──────────────────────────────────────────── */}
      <div className="stats-grid-2">
        <div className="stats-card">
          <SectionTitle>Top Charges by Race</SectionTitle>
          <p className="stats-card-note">Top 5 charge categories per racial group.</p>
          <ChargesByGroupTable data={chargesByRace} />
        </div>
        <div className="stats-card">
          <SectionTitle>Top Charges by Sex</SectionTitle>
          <p className="stats-card-note">Top 5 charge categories per sex.</p>
          <ChargesByGroupTable data={chargesBySex} />
        </div>
      </div>

      {/* ── Recidivism ─────────────────────────────────────────────────────── */}
      {recidivism && (
        <div className="stats-card">
          <SectionTitle>Repeat Bookers</SectionTitle>
          <div className="stats-age-meta" style={{ marginBottom: '0.8rem' }}>
            <span>Repeat rate {recidivism.rate}%</span>
            <span>{recidivism.repeatBookerCount} repeat individuals</span>
            <span>{recidivism.totalIndividuals} total individuals</span>
          </div>
          {recidivism.repeatBookers?.length > 0 ? (
            <table className="stats-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: '0.4rem', color: C.muted, fontWeight: 400, fontSize: '0.8rem' }}>Name</th>
                  <th style={{ textAlign: 'right', paddingBottom: '0.4rem', color: C.muted, fontWeight: 400, fontSize: '0.8rem' }}>Bookings</th>
                </tr>
              </thead>
              <tbody>
                {recidivism.repeatBookers.map(r => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td className="stats-table-num">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <NoData msg="No repeat bookers detected yet." />
          )}
        </div>
      )}
    </div>
  )
}
