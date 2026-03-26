import { useState, useEffect } from 'react'
import Header from './components/Header'
import StatBar from './components/StatBar'
import BookingLog from './components/BookingLog'

export default function App() {
  const [log, setLog] = useState([])
  const [status, setStatus] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/log').then(r => r.json()),
      fetch('/api/status').then(r => r.json())
    ]).then(([logData, statusData]) => {
      setLog(logData)
      setStatus(statusData)
      setLoading(false)
    })
  }, [])

  const filtered = log.filter(entry => {
    const matchSearch = entry.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ||
      (filter === 'in_custody' && entry.status === 'in_custody') ||
      (filter === 'released' && entry.status === 'released')
    return matchSearch && matchFilter
  })

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
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'in_custody' ? 'active' : ''} onClick={() => setFilter('in_custody')}>In Custody</button>
          <button className={filter === 'released' ? 'active' : ''} onClick={() => setFilter('released')}>Released</button>
        </div>
      </div>
      {loading ? (
        <div className="loading">Loadi0ng records...</div>
      ) : (
        <BookingLog entries={filtered} />
      )}
    </div>
  )
}