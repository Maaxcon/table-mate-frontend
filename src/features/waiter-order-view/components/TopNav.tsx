import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import "./TopNav.css"

interface TopNavProps {
  occupiedCount: number
  reservedCount: number
  freeCount: number
}

function getTimeString(): string {
  const d = new Date()
  const h = d.getHours().toString().padStart(2, "0")
  const m = d.getMinutes().toString().padStart(2, "0")
  return `${h}:${m}`
}

function useCurrentTime(): string {
  const [time, setTime] = useState(getTimeString)
  useEffect(() => {
    const id = setInterval(() => setTime(getTimeString()), 10_000)
    return () => clearInterval(id)
  }, [])
  return time
}

export function TopNav({ occupiedCount, reservedCount, freeCount }: TopNavProps) {
  const currentTime = useCurrentTime()

  return (
    <nav className="top-nav">
      <div className="top-nav__left">
        <div className="top-nav__logo">
          <span className="top-nav__logo-grid">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="top-nav__logo-text">LIVE OCCUPANCY</span>
        </div>
      </div>

      <div className="top-nav__right">
        <span className="top-nav__stat">
          <span className="top-nav__stat-icon top-nav__stat-icon--filled" />
          OCCUPIED: {occupiedCount}
        </span>
        <span className="top-nav__stat">
          <span className="top-nav__stat-icon top-nav__stat-icon--reserved" />
          RESERVED: {reservedCount}
        </span>
        <span className="top-nav__stat">
          <span className="top-nav__stat-icon" />
          FREE: {freeCount}
        </span>
        <span className="top-nav__time">{currentTime}</span>
        <Link to="/staff/orders" className="top-nav__nav-link">
          KITCHEN
        </Link>
        <div className="top-nav__avatar" />
      </div>
    </nav>
  )
}
