import { useCallback, useMemo, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"

// Zoom + drag-to-pan chrome layered OUTSIDE FloorPlanView's own auto-fit —
// zoom=1 is exactly whatever FloorPlanView already fit itself to (the whole
// canvas, or a `frame` crop); this hook only adds a multiplier on top via an
// outer `transform: scale(zoom) translate(panX, panY)` wrapper. Panning is
// mouse-only (touch keeps native scrolling elsewhere on the page) and tracked
// as JS state rather than native scroll, since the wrapper clips via
// `overflow: hidden`, not a scrollable box. A small drag threshold means a
// plain tap still books a table (didPanRef suppresses the click when the
// pointer actually moved). Zoom/pan reset on a zone switch by remounting
// <FloorMap key={zone}>, so there's no reset effect here.
export function useFloorZoomPan(viewportWidth: number, viewportHeight = 0) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const scale = zoom

  // How far the zoomed content can be dragged before its edge would show
  // empty space — an approximation (half the extra size zoom adds), not an
  // exact bound on FloorPlanView's own fitted content box.
  const maxPanX = Math.max(0, ((zoom - 1) * viewportWidth) / 2)
  const maxPanY = Math.max(0, ((zoom - 1) * viewportHeight) / 2)
  const clampPan = useCallback(
    (p: { x: number; y: number }) => ({
      x: Math.max(-maxPanX, Math.min(maxPanX, p.x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, p.y)),
    }),
    [maxPanX, maxPanY],
  )

  const zoomIn = useCallback(() => setZoom((z) => Math.min(4, z * 1.25)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(1, z / 1.25)), [])
  const zoomFit = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const panRef = useRef<{ x: number; y: number; startPan: { x: number; y: number } } | null>(null)
  const didPanRef = useRef(false)

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== "mouse") return
      didPanRef.current = false
      panRef.current = { x: e.clientX, y: e.clientY, startPan: pan }
    },
    [pan],
  )
  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = panRef.current
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      if (!didPanRef.current && Math.hypot(dx, dy) < 6) return
      didPanRef.current = true
      setPan(clampPan({ x: p.startPan.x + dx, y: p.startPan.y + dy }))
    },
    [clampPan],
  )
  const onPointerUp = useCallback(() => {
    panRef.current = null
  }, [])

  const panHandlers = useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp }),
    [onPointerDown, onPointerMove, onPointerUp],
  )

  return { scale, pan, zoomIn, zoomOut, zoomFit, didPanRef, panHandlers }
}
