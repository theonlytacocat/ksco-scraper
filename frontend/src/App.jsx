import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useSearchParams } from 'react-router-dom'
import Header from './components/Header'
import StatBar from './components/StatBar'
import BookingLog from './components/BookingLog'

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InCustodyPage />} />
        <Route path="/released" element={<ReleasedPage />} />
      </Routes>
    </BrowserRouter>
  )
}
