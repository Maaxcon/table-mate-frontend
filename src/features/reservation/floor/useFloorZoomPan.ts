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
  // Zoom and pan live in one state so every zoom change re-clamps pan against
  // the NEW zoom's bounds in the same update — the pan range shrinks as zoom
  // drops, and a stale corner offset at a lower zoom would translate the whole
  // floor out of the viewport, leaving a blank map.
  const [view, setView] = useState({ zoom: 1, pan: { x: 0, y: 0 } })
  const { zoom, pan } = view

  // How far the zoomed content can be dragged before its edge would show
  // empty space — an approximation (half the extra size zoom adds), not an
  // exact bound on FloorPlanView's own fitted content box.
  const clampPanFor = useCallback(
    (zoom: number, p: { x: number; y: number }) => {
      const maxPanX = Math.max(0, ((zoom - 1) * viewportWidth) / 2)
      const maxPanY = Math.max(0, ((zoom - 1) * viewportHeight) / 2)
      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, p.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, p.y)),
      }
    },
    [viewportWidth, viewportHeight],
  )

  const applyZoom = useCallback(
    (next: (z: number) => number) =>
      setView((v) => {
        const zoom = next(v.zoom)
        return { zoom, pan: clampPanFor(zoom, v.pan) }
      }),
    [clampPanFor],
  )

  const zoomIn = useCallback(() => applyZoom((z) => Math.min(4, z * 1.25)), [applyZoom])
  const zoomOut = useCallback(() => applyZoom((z) => Math.max(1, z / 1.25)), [applyZoom])
  const zoomFit = useCallback(() => setView({ zoom: 1, pan: { x: 0, y: 0 } }), [])

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
      setView((v) => ({
        ...v,
        pan: clampPanFor(v.zoom, { x: p.startPan.x + dx, y: p.startPan.y + dy }),
      }))
    },
    [clampPanFor],
  )
  const onPointerUp = useCallback(() => {
    panRef.current = null
  }, [])

  const panHandlers = useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp }),
    [onPointerDown, onPointerMove, onPointerUp],
  )

  return { scale: zoom, pan, zoomIn, zoomOut, zoomFit, didPanRef, panHandlers }
}
