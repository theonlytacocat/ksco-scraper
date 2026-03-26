import { useState } from 'react'

function formatHeight(raw) {
  if (!raw) return 'N/A'
  const str = String(raw)
  if (str.length === 3) return `${str[0]}'${str.slice(1)}"`
  if (str.length === 4) return `${str.slice(0,2)}'${str.slice(2)}"`
  return raw
}

function formatRace(code) {
  const map = { W: 'White', B: 'Black', H: 'Hispanic', A: 'Asian', I: 'Native American', U: 'Unknown' }
  return map[code] || code || 'N/A'
}

export default function BookingCard({ entry }) {
  const [open, setOpen] = useState(false)

  const isReleased = entry.status === 'released'

  return (
    <div className={`card ${isReleased ? 'card-released' : 'card-custody'}`}>
      <div className="card-header" onClick={() => setOpen(!open)}>
        <div className="card-left">
          <div className="card-name">{entry.name}</div>
          <div className="card-meta">
            Booking #{entry.bookingNumber} &nbsp;·&nbsp; Booked: {entry.bookingDate || entry.firstSeen}
          </div>
        </div>
        <div className="card-right">
          <span className={`badge ${isReleased ? 'badge-released' : 'badge-custody'}`}>
            {isReleased ? 'Released' : 'In Custody'}
          </span>
          <span className="card-toggle">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="card-body">
          {isReleased && entry.releasedAt && (
            <div className="card-release-row">
              Released: {entry.releasedAt}
            </div>
          )}
          {entry.schedRelease && !isReleased && (
            <div className="card-release-row">
              Scheduled Release: {entry.schedRelease}
            </div>
          )}

          <div className="card-description">
            <div className="desc-row">
              <span>Age</span><span>{entry.age || 'N/A'}</span>
            </div>
            <div className="desc-row">
              <span>Sex</span><span>{entry.sex || 'N/A'}</span>
            </div>
            <div className="desc-row">
              <span>Race</span><span>{formatRace(entry.race)}</span>
            </div>
            <div className="desc-row">
              <span>Height</span><span>{formatHeight(entry.height)}</span>
            </div>
            <div className="desc-row">
              <span>Weight</span><span>{entry.weight ? `${entry.weight} lbs` : 'N/A'}</span>
            </div>
            <div className="desc-row">
              <span>Hair</span><span>{entry.hair || 'N/A'}</span>
            </div>
            <div className="desc-row">
              <span>Eyes</span><span>{entry.eyes || 'N/A'}</span>
            </div>
          </div>

          {entry.charges && entry.charges.length > 0 && (
            <div className="card-charges">
              <div className="charges-title">Charges ({entry.charges.length})</div>
              {entry.charges.map((c, i) => (
                <div key={i} className="charge-row">
                  <div className="charge-violation">{c.violation}</div>
                  {(c.bondAmount || c.cashAmount) && (
                    <div className="charge-bail">
                      Bond: {c.bondAmount || 'N/A'} &nbsp;·&nbsp; Cash: {c.cashAmount || 'N/A'}
                    </div>
                  )}
                  {c.nextCourtDate && (
                    <div className="charge-court">Next court: {c.nextCourtDate}</div>
                  )}
                  {c.arrestAgency && (
                    <div className="charge-agency">Arrested by: {c.arrestAgency}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}