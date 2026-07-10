import type { CSSProperties } from "react"
import { LuArrowRight } from "react-icons/lu"
import type { TileGeometry } from "./FloorTile"

const pieceStyle = (geometry: TileGeometry): CSSProperties =>
  ({
    left: geometry.left,
    top: geometry.top,
    width: geometry.width,
    height: geometry.height,
    "--rot": `${geometry.rotation}deg`,
  }) as CSSProperties

// Non-table furniture on the floor: a wall/pillar (obstacle), a doorway
// (threshold) or a tap-to-jump zone portal. Called once per entity from
// FloorMap's renderEntity closure — geometry comes from FloorPlanView.

export function renderObstacle(key: string, geometry: TileGeometry) {
  return (
    <div
      key={key}
      className="c-floor-plan__piece c-floor-plan__obstacle"
      aria-hidden="true"
      style={pieceStyle(geometry)}
    />
  )
}

export function renderThreshold(key: string, geometry: TileGeometry, label: string | undefined) {
  return (
    <div
      key={key}
      className="c-floor-plan__piece c-floor-plan__threshold"
      aria-hidden="true"
      style={pieceStyle(geometry)}
    >
      {label ? <span className="c-floor-plan__threshold-label">{label}</span> : null}
    </div>
  )
}

export function renderPortal(
  key: string,
  geometry: TileGeometry,
  opts: {
    label: string | undefined
    targetZoneId: string | undefined
    zoneName: string | undefined
    onNavigate: (zoneId: string) => void
  },
) {
  return (
    <button
      key={key}
      type="button"
      className="c-floor-plan__piece c-floor-plan__portal"
      onClick={() => opts.targetZoneId && opts.onNavigate(opts.targetZoneId)}
      disabled={!opts.targetZoneId}
      style={pieceStyle(geometry)}
    >
      <LuArrowRight aria-hidden="true" />
      <span className="c-floor-plan__portal-label">{opts.label || opts.zoneName || "→"}</span>
    </button>
  )
}
