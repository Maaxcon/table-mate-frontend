import { useCallback, useState } from "react"
import { toggleItemLike } from "../api"
import type { MenuItem } from "../types"

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

  const isPending = useCallback((publicId: string) => Boolean(pending[publicId]), [pending])

  const toggleLike = useCallback(
    async (item: MenuItem) => {
      if (pending[item.public_id]) return
      setPending((prev) => ({ ...prev, [item.public_id]: true }))
      try {
        const updated = await toggleItemLike(restaurantId, item.public_id, guestToken)
        onLiked(item.public_id, updated.is_liked, updated.likes_count)
      } catch {
        // Like failed (network/server) — keep current state, just stop the spinner.
      } finally {
        setPending((prev) => ({ ...prev, [item.public_id]: false }))
      }
    },
    [pending, restaurantId, guestToken, onLiked],
  )

  return { isPending, toggleLike }
}
