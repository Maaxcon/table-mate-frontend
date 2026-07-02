import type { CSSProperties } from "react"
import { LuArrowRight } from "react-icons/lu"
import type { LayoutPayload } from "@/features/editor/types"

// Position + rotation style for ANY layout element (walls, doorways, portals, and
// future shapes). Rotation goes through the --rot CSS variable so a single
// `.c-floor-plan__piece` rule handles it for every element type — add a new shape
// and it can rotate with no extra JS.
const pieceStyle = (el: {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}): CSSProperties =>
  ({
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    "--rot": `${el.rotation ?? 0}deg`,
  }) as CSSProperties

// Non-table furniture on the floor: walls/pillars (obstacles), doorways
// (thresholds) and tap-to-jump zone portals.
export function FloorDecor({
  obstacles,
  thresholds,
  portals,
  zoneNameById,
  onPortalNavigate,
}: {
  obstacles: LayoutPayload["obstacles"]
  thresholds: LayoutPayload["thresholds"]
  portals: LayoutPayload["portals"]
  zoneNameById: Map<string, string>
  onPortalNavigate: (zoneId: string) => void
}) {
  return (
    <>
      {/* Walls / pillars — solid blocks the guests can't sit at. */}
      {obstacles.map((o, i) => (
        <div
          key={`obstacle-${i}`}
          className="c-floor-plan__piece c-floor-plan__obstacle"
          aria-hidden="true"
          style={pieceStyle(o)}
        />
      ))}

      {/* Thresholds — doorways / passages. */}
      {thresholds.map((t, i) => (
        <div
          key={`threshold-${i}`}
          className="c-floor-plan__piece c-floor-plan__threshold"
          aria-hidden="true"
          style={pieceStyle(t)}
        >
          {t.label ? <span className="c-floor-plan__threshold-label">{t.label}</span> : null}
        </div>
      ))}

      {/* Portals — tap to jump to the linked zone (terrace, etc.). */}
      {portals.map((p, i) => (
        <button
          key={`portal-${i}`}
          type="button"
          className="c-floor-plan__piece c-floor-plan__portal"
          onClick={() => p.target_zone_id && onPortalNavigate(p.target_zone_id)}
          disabled={!p.target_zone_id}
          style={pieceStyle(p)}
        >
          <LuArrowRight aria-hidden="true" />
          <span className="c-floor-plan__portal-label">
            {p.portal_label || p.label || zoneNameById.get(p.target_zone_id ?? "") || "→"}
          </span>
        </button>
      ))}
    </>
  )
}
