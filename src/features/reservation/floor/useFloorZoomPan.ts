import { useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent, RefObject } from "react"

// Zoom + drag-to-pan for the floor viewport. zoom=1 fits the whole room (overview);
// buttons multiply on top so guests zoom IN from there. Panning is mouse-only so
// touch keeps native scrolling; a small threshold means a plain tap still books a
// table (didPanRef suppresses the click when the pointer was actually dragged).
// Zoom resets on a zone switch by remounting <FloorMap key={zone}>, so there's no
// reset effect here.
export function useFloorZoomPan(
  viewportRef: RefObject<HTMLDivElement | null>,
  canvasWidth: number,
  viewportWidth: number,
) {
  const [zoom, setZoom] = useState(1)
  const fitScale = viewportWidth > 0 ? Math.min(1, viewportWidth / canvasWidth) : 1
  const scale = Math.min(2.6, fitScale * zoom)
  const zoomIn = () => setZoom((z) => Math.min(4, z * 1.25))
  const zoomOut = () => setZoom((z) => Math.max(1, z / 1.25))
  const zoomFit = () => setZoom(1)

  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const didPanRef = useRef(false)

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current
    if (!el || e.pointerType !== "mouse") return
    didPanRef.current = false
    panRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current
    const p = panRef.current
    if (!el || !p) return
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    if (!didPanRef.current && Math.hypot(dx, dy) < 6) return
    didPanRef.current = true
    el.scrollLeft = p.left - dx
    el.scrollTop = p.top - dy
  }
  const onPointerUp = () => {
    panRef.current = null
  }

  return {
    scale,
    zoomIn,
    zoomOut,
    zoomFit,
    didPanRef,
    panHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp },
  }
}
