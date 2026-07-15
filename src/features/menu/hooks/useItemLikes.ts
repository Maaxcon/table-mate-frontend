import { useCallback, useEffect, useRef } from "react"
import { toggleItemLike } from "@/features/menu/api"
import type { MenuItem } from "@/features/menu/types"

type LikeQueueEntry = {
  queuedClicks: number
  timerId: number | null
  inFlight: boolean
  controller: AbortController | null
}

/**
 * Handles like toggling for menu items with optimistic UI and a per-item
 * debounce window. Rapid taps on the same dish collapse into one toggle API
 * request, and failures stay silent.
 */
export function useItemLikes(
  restaurantId: string,
  guestToken: string,
  onLiked: (publicId: string, isLiked: boolean, likesCount: number) => void,
) {
  const queueRef = useRef<Map<string, LikeQueueEntry>>(new Map())
  const flushLikeRef = useRef<(publicId: string) => void>(() => {})

  const isPending = useCallback((publicId: string) => {
    const entry = queueRef.current.get(publicId)
    return Boolean(entry && (entry.inFlight || entry.timerId))
  }, [])

  const clearEntryTimer = useCallback((publicId: string) => {
    const entry = queueRef.current.get(publicId)
    if (!entry?.timerId) return
    window.clearTimeout(entry.timerId)
    entry.timerId = null
  }, [])

  const scheduleFlush = useCallback(
    (publicId: string) => {
      const entry = queueRef.current.get(publicId)
      if (!entry) return
      clearEntryTimer(publicId)
      entry.timerId = window.setTimeout(() => {
        flushLikeRef.current(publicId)
      }, 250)
    },
    [clearEntryTimer],
  )

  const flushLike = useCallback(
    async (publicId: string) => {
      const entry = queueRef.current.get(publicId)
      if (!entry || entry.inFlight) return
      if (entry.queuedClicks % 2 === 0) {
        entry.queuedClicks = 0
        clearEntryTimer(publicId)
        return
      }

      entry.inFlight = true
      clearEntryTimer(publicId)
      const controller = new AbortController()
      entry.controller = controller
      let succeeded = false

      try {
        const updated = await toggleItemLike(restaurantId, publicId, guestToken, controller.signal)
        onLiked(publicId, updated.is_liked, updated.likes_count)
        succeeded = true
      } catch {
        if (!controller.signal.aborted) {
          // Silent failure: keep the optimistic UI state and stop retrying.
        }
      } finally {
        const current = queueRef.current.get(publicId)
        if (current) {
          current.inFlight = false
          current.controller = null
          current.queuedClicks =
            succeeded && current.queuedClicks > 0 ? current.queuedClicks - 1 : 0
          const hasMoreClicks = current.queuedClicks % 2 === 1
          if (hasMoreClicks) {
            scheduleFlush(publicId)
          } else {
            clearEntryTimer(publicId)
          }
        }
      }
    },
    [clearEntryTimer, guestToken, onLiked, restaurantId, scheduleFlush],
  )

  useEffect(() => {
    flushLikeRef.current = (publicId: string) => {
      void flushLike(publicId)
    }
  }, [flushLike])

  const toggleLike = useCallback(
    (item: MenuItem) => {
      const entry = queueRef.current.get(item.public_id) ?? {
        queuedClicks: 0,
        timerId: null,
        inFlight: false,
        controller: null,
      }
      if (!queueRef.current.has(item.public_id)) {
        queueRef.current.set(item.public_id, entry)
      }

      entry.queuedClicks += 1
      onLiked(item.public_id, !item.is_liked, item.likes_count + (item.is_liked ? -1 : 1))
      scheduleFlush(item.public_id)
    },
    [onLiked, scheduleFlush],
  )

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- teardown intentionally drains the live queue.
      const queue = queueRef.current
      for (const entry of queue.values()) {
        if (entry.timerId) window.clearTimeout(entry.timerId)
        entry.controller?.abort()
      }
      queue.clear()
    }
  }, [])

  useEffect(() => {
    const queue = queueRef.current
    for (const entry of queue.values()) {
      if (entry.timerId) window.clearTimeout(entry.timerId)
      entry.controller?.abort()
    }
    queue.clear()
  }, [guestToken, restaurantId])

  return { isPending, toggleLike }
}
