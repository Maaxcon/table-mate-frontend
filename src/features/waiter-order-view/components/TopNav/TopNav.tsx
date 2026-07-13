import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { Zone } from "@/features/reservation/api"
import "./TopNav.css"

interface TopNavProps {
  occupiedCount: number
  reservedCount: number
  freeCount: number
  isConnected: boolean
  zones: Zone[]
  selectedZoneId: string | null
  onZoneChange?: (zoneId: string) => void
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

export function TopNav({
  occupiedCount,
  reservedCount,
  freeCount,
  isConnected,
  zones,
  selectedZoneId,
  onZoneChange,
}: TopNavProps) {
  const currentTime = useCurrentTime()

  return (
    <nav className="top-nav">
      <div className="top-nav__left">
        <div className="top-nav__brand">
          <span className="top-nav__logo" aria-hidden="true">
            <span className="top-nav__logo-dot" />
          </span>
          <div className="top-nav__brand-copy">
            <span className="top-nav__brand-title">LIVE OCCUPANCY</span>
            <span className="top-nav__brand-subtitle">STATION · FLOOR</span>
          </div>
        </div>

        {zones.length > 0 && (
          <div className="top-nav__zones" role="group" aria-label="Dining rooms">
            {zones.map((zone) => (
              <button
                key={zone.public_id}
                type="button"
                className={`top-nav__zone ${selectedZoneId === zone.public_id ? "top-nav__zone--active" : ""}`}
                onClick={() => onZoneChange?.(zone.public_id)}
                aria-pressed={selectedZoneId === zone.public_id}
              >
                {zone.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="top-nav__right">
        <div className="top-nav__stats">
          <div className="top-nav__stat">
            <span className="top-nav__sr-only">Occupied tables</span>
            <span className="top-nav__stat-chip top-nav__stat-chip--occupied" aria-hidden="true" />
            <span className="top-nav__stat-label" aria-hidden="true">
              OCCUPIED
            </span>
            <span className="top-nav__stat-value">{occupiedCount}</span>
          </div>
          <div className="top-nav__stat">
            <span className="top-nav__sr-only">Reserved tables</span>
            <span className="top-nav__stat-chip top-nav__stat-chip--reserved" aria-hidden="true" />
            <span className="top-nav__stat-label" aria-hidden="true">
              RESERVED
            </span>
            <span className="top-nav__stat-value">{reservedCount}</span>
          </div>
          <div className="top-nav__stat">
            <span className="top-nav__sr-only">Free tables</span>
            <span className="top-nav__stat-chip top-nav__stat-chip--free" aria-hidden="true" />
            <span className="top-nav__stat-label" aria-hidden="true">
              FREE
            </span>
            <span className="top-nav__stat-value">{freeCount}</span>
          </div>
        </div>

        <div className="top-nav__time-wrap">
          <span className="top-nav__time">{currentTime}</span>
          <span className="top-nav__time-label">LOCAL TIME</span>
        </div>

        <span
          className={`top-nav__connection ${isConnected ? "top-nav__connection--connected" : ""}`}
          role="status"
          aria-label={isConnected ? "Connected" : "Disconnected"}
        />

        <Link to="/staff/orders" className="top-nav__nav-link">
          KITCHEN
        </Link>
      </div>
    </nav>
  )
}
