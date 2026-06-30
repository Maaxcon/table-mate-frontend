import { useCallback, useRef, useState } from "react"
import { toggleItemLike } from "@/features/menu/api"
import type { MenuItem } from "@/features/menu/types"

/**
 * Handles like toggling for menu items: tracks per-item pending state, calls the
 * API, and reports the new like state via `onLiked`. Failures are swallowed
 * (the spinner just stops) so the UI keeps its current state.
 */
export function useItemLikes(
  restaurantId: string,
  guestToken: string,
  onLiked: (publicId: string, isLiked: boolean, likesCount: number) => void,
) {
  const [pending, setPending] = useState<Record<string, boolean>>({})
  // Tracks in-flight ids so the guard doesn't depend on `pending` state, which
  // would rebuild toggleLike (and every consumer's handler) on each toggle.
  const inFlight = useRef<Set<string>>(new Set())

  const isPending = useCallback((publicId: string) => Boolean(pending[publicId]), [pending])

  const toggleLike = useCallback(
    async (item: MenuItem) => {
      if (inFlight.current.has(item.public_id)) return
      inFlight.current.add(item.public_id)
      setPending((prev) => ({ ...prev, [item.public_id]: true }))
      try {
        const updated = await toggleItemLike(restaurantId, item.public_id, guestToken)
        onLiked(item.public_id, updated.is_liked, updated.likes_count)
      } catch {
        // Like failed (network/server) — keep current state, just stop the spinner.
      } finally {
        inFlight.current.delete(item.public_id)
        setPending((prev) => ({ ...prev, [item.public_id]: false }))
      }
    },
    [restaurantId, guestToken, onLiked],
  )

  return { isPending, toggleLike }
}
