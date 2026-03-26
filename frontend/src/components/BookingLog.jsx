import BookingCard from './BookingCard'

export default function BookingLog({ entries }) {
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
