import { useCallback, useMemo, useRef, useState } from "react"
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
  viewportHeight = 0,
  content: { x: number; y: number; w: number; h: number } | null = null,
) {
  const [zoom, setZoom] = useState(1)
  // Prefer framing the tables (content) so they read large on open; fall back to
  // fitting the whole canvas width when we have no content box yet.
  const FIT_PAD = 14
  let fitScale: number
  if (content && content.w > 0 && content.h > 0 && viewportWidth > 0 && viewportHeight > 0) {
    const widthFit = (viewportWidth - FIT_PAD * 2) / content.w
    const heightFit = (viewportHeight - FIT_PAD * 2) / content.h
    // Bias toward bigger tables (height fit) but cap how far the content may
    // spill past the viewport width, so side-panning on open stays small.
    fitScale = Math.max(widthFit, Math.min(heightFit, (viewportWidth * 1.35) / content.w))
    // Keep it sane: never upscale past 2x (tiny rooms) or below a floor.
    fitScale = Math.max(0.1, Math.min(fitScale, 2))
  } else {
    fitScale = viewportWidth > 0 ? Math.min(1, viewportWidth / canvasWidth) : 1
  }
  const scale = Math.min(2.6, fitScale * zoom)
  const zoomIn = useCallback(() => setZoom((z) => Math.min(4, z * 1.25)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(1, z / 1.25)), [])
  const zoomFit = useCallback(() => setZoom(1), [])

  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const didPanRef = useRef(false)

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = viewportRef.current
      if (!el || e.pointerType !== "mouse") return
      didPanRef.current = false
      panRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
    },
    [viewportRef],
  )
  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = viewportRef.current
      const p = panRef.current
      if (!el || !p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      if (!didPanRef.current && Math.hypot(dx, dy) < 6) return
      didPanRef.current = true
      el.scrollLeft = p.left - dx
      el.scrollTop = p.top - dy
    },
    [viewportRef],
  )
  const onPointerUp = useCallback(() => {
    panRef.current = null
  }, [])

  const panHandlers = useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp }),
    [onPointerDown, onPointerMove, onPointerUp],
  )

  return { scale, zoomIn, zoomOut, zoomFit, didPanRef, panHandlers }
}
