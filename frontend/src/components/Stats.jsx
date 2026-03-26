import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// ── Color palette pulled from the site's existing CSS vars ──────────────────
const C = {
  rust:    '#8b4a1e',
  red:     '#c1440e',
  dark:    '#3d2b1a',
  tan:     '#c9b89e',
  muted:   '#7a5c3e',
  bg:      '#ede6da',
  text:    '#2c1f14',
  grid:    '#d8cbb8',
}

const RACE_COLORS = ['#8b4a1e', '#c1440e', '#5a8a4a', '#4a6a8a', '#8a4a7a', '#6a8a4a']

function SectionTitle({ children }) {
  return <h3 className="stats-section-title">{children}</h3>
}

function NoData({ msg = 'Insufficient data — check back as records accumulate.' }) {
  return <div className="stats-nodata">{msg}</div>
}

// Custom tooltip so it fits the site aesthetic
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="stats-tooltip">
      <div className="stats-tooltip-label">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="stats-tooltip-val">{p.value.toLocaleString()}</div>
      ))}
    </div>
  )
}

// Horizontal bar chart — used for charges, agencies, etc.
function HBar({ data, dataKey = 'count', nameKey = 'label', color = C.rust, height }) {
  if (!data?.length) return <NoData />
  const h = height || Math.max(220, data.length * 32)
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey={nameKey}
          width={200}
          tick={{ fill: C.text, fontSize: 12, fontFamily: 'Georgia, serif' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey={dataKey} fill={color} radius={[0, 2, 2, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Vertical bar chart — demographics, age histogram, monthly trend
function VBar({ data, dataKey = 'count', nameKey = 'label', colors, color = C.rust }) {
  if (!data?.length) return <NoData />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis
          dataKey={nameKey}
          tick={{ fill: C.text, fontSize: 11, fontFamily: 'Georgia, serif' }}
          axisLine={false}
          tickLine={false}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} maxBarSize={50}>
          {colors && data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function Stats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="stats-page">
      <div className="stats-header">
        <Link to="/" className="back-link">← Main Page</Link>
        <h2>Jail Statistics</h2>
      </div>
      <div className="loading">Crunching numbers...</div>
    </div>
  )

  if (error) return (
    <div className="stats-page">
      <div className="stats-header">
        <Link to="/" className="back-link">← Main Page</Link>
        <h2>Jail Statistics</h2>
      </div>
      <div className="stats-nodata">Error: {error}</div>
    </div>
  )

  const { bookingCounts, gender, race, age, topCharges, stay, bookingsByMonth } = data

  const total = bookingCounts.total

  return (
    <div className="stats-page">
      <div className="stats-header">
        <Link to="/" className="back-link">← Main Page</Link>
        <h2>Jail Statistics</h2>
        <p className="stats-subtitle">
          {total.toLocaleString()} bookings &middot; {bookingCounts.inCustody.toLocaleString()} in custody &middot; {bookingCounts.released.toLocaleString()} released
          {data.generatedAt && (
            <> &middot; {new Date(data.generatedAt).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT</>
          )}
        </p>
      </div>

      {/* ── Top Charges ──────────────────────────────────────────────────── */}
      <div className="stats-card">
        <SectionTitle>Top Charge Categories</SectionTitle>
        <p className="stats-card-note">
          Bookings by primary charge category. A single booking may carry multiple charge types.
        </p>
        <HBar data={topCharges} color={C.rust} />
      </div>

      {/* ── Demographics ─────────────────────────────────────────────────── */}
      <div className="stats-grid-2">
        <div className="stats-card">
          <SectionTitle>Race</SectionTitle>
          <VBar data={race} colors={RACE_COLORS} />
          <table className="stats-table">
            <tbody>
              {race.map(r => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td className="stats-table-num">{r.count.toLocaleString()}</td>
                  <td className="stats-table-pct">{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stats-card">
          <SectionTitle>Sex</SectionTitle>
          <VBar data={gender} color={C.red} />
          <table className="stats-table">
            <tbody>
              {gender.map(g => (
                <tr key={g.label}>
                  <td>{g.label}</td>
                  <td className="stats-table-num">{g.count.toLocaleString()}</td>
                  <td className="stats-table-pct">{g.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Age Distribution ─────────────────────────────────────────────── */}
      {age && (
        <div className="stats-card">
          <SectionTitle>Age Distribution</SectionTitle>
          <div className="stats-age-meta">
            <span>Min {age.min}</span>
            <span>Median {age.median}</span>
            <span>Mean {age.mean}</span>
            <span>Max {age.max}</span>
          </div>
          <VBar data={age.histogram} color={C.dark} />
        </div>
      )}

      {/* ── Bookings Over Time ───────────────────────────────────────────── */}
      {bookingsByMonth?.length > 1 && (
        <div className="stats-card">
          <SectionTitle>Bookings by Month</SectionTitle>
          <VBar data={bookingsByMonth} nameKey="month" color={C.rust} />
        </div>
      )}

      {/* ── Length of Stay (released bookings only) ──────────────────────── */}
      {stay && (
        <div className="stats-card">
          <SectionTitle>Length of Stay</SectionTitle>
          <p className="stats-card-note">Based on {stay.count} completed release{stay.count !== 1 ? 's' : ''}.</p>
          <div className="stats-age-meta">
            <span>Min {stay.min}d</span>
            <span>Median {stay.median}d</span>
            <span>Mean {stay.mean}d</span>
            <span>Max {stay.max}d</span>
          </div>
          <VBar data={stay.histogram} color={C.muted} />
        </div>
      )}
    </div>
  )
}
