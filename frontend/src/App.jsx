import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Header from './components/Header'
import StatBar from './components/StatBar'
import BookingCard from './components/BookingCard'
import HistoryLog from './components/HistoryLog'

function InCustodyPage() {
  const [log, setLog] = useState([])
  const [status, setStatus] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/log').then(r => r.json()),
      fetch('/api/status').then(r => r.json())
    ]).then(([logData, statusData]) => {
      setLog(logData.filter(e => e.status === 'in_custody'))
      setStatus(statusData)
      setLoading(false)
    })
  }, [])

  const filtered = log.filter(entry =>
    entry.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="app">
      <Header />
      {status && <StatBar status={status} />}
      <div className="controls">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="filter-tabs">
          <Link to="/" className="active">In Custody</Link>
          <Link to="/released">Released</Link>
          <Link to="/history">History</Link>
        </div>
      </div>
      {loading ? (
        <div className="loading">Loading records...</div>
      ) : (
        <BookingLog entries={filtered} />
      )}
    </div>
  )
}

function ReleasedPage() {
  const [log, setLog] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/log').then(r => r.json()).then(logData => {
      setLog(logData.filter(e => e.status === 'released'))
      setLoading(false)
    })
  }, [])

  const filtered = log.filter(entry =>
    entry.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="app">
      <Header />
      <div className="controls">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="filter-tabs">
          <Link to="/">In Custody</Link>
          <Link to="/released" className="active">Released</Link>
          <Link to="/history">History</Link>
        </div>
      </div>
      {loading ? (
        <div className="loading">Loading records...</div>
      ) : (
        <BookingLog entries={filtered} />
      )}
    </div>
  )
}

function HistoryPage() {
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/log').then(r => r.json()).then(logData => {
      setLog(logData)
      setLoading(false)
    })
  }, [])

  return (
    <div className="app">
      <Header />
      <div className="controls">
        <div className="filter-tabs">
          <Link to="/">In Custody</Link>
          <Link to="/released">Released</Link>
          <Link to="/history" className="active">History</Link>
        </div>
      </div>
      {loading ? (
        <div className="loading">Loading records...</div>
      ) : (
        <HistoryLog entries={log} />
      )}
    </div>
  )
}

function BookingLog({ entries }) {
  if (entries.length === 0) {
    return <div className="empty">No records match your search.</div>
  }
  return (
    <div className="log">
      <div className="log-count">{entries.length} record{entries.length !== 1 ? 's' : ''}</div>
      {entries.map(entry => (
        <BookingCard key={entry.bookingNumber} entry={entry} />
      ))}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InCustodyPage />} />
        <Route path="/released" element={<ReleasedPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  )
}
