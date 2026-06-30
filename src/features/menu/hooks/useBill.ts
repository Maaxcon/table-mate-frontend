import { useCallback, useState } from "react"
import { fetchBill, payOrderItems, type BillItem } from "@/features/menu/api"

type UseBillOptions = {
  cartSessionId: string | null
  guestJwt: string | null
}

export type UseBillResult = {
  items: BillItem[]
  loading: boolean
  refresh: () => Promise<void>
  pay: (orderItemIds: string[]) => Promise<void>
}

/**
 * The bill: items already ordered (submitted to the kitchen) for this table's
 * visit, fetched on demand. Separate from the cart — the cart is the next round
 * a guest is composing, the bill is what has already been ordered and is owed.
 */
export function useBill({ cartSessionId, guestJwt }: UseBillOptions): UseBillResult {
  const [items, setItems] = useState<BillItem[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!cartSessionId || !guestJwt) return
    setLoading(true)
    try {
      setItems(await fetchBill(cartSessionId, guestJwt))
    } catch {
      // Leave the last-known bill in place; the drawer just won't update.
    } finally {
      setLoading(false)
    }
  }, [cartSessionId, guestJwt])

  const pay = useCallback(
    async (orderItemIds: string[]) => {
      if (!cartSessionId || !guestJwt || orderItemIds.length === 0) return
      // The endpoint returns the updated bill, so no extra refresh is needed.
      setItems(await payOrderItems(cartSessionId, orderItemIds, guestJwt))
    },
    [cartSessionId, guestJwt],
  )

  return { items, loading, refresh, pay }
}
