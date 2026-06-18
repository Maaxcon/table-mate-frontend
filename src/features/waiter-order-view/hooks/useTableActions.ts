import { useCallback, useState } from "react"
import { apiFetch } from "@/api/client"

type UseTableActionsOptions = {
  selectedTableId: string | null
  // Run after an action succeeds — e.g. refresh the floor and close the overlay.
  onActionComplete: () => void | Promise<void>
}

// Owns the open-table / activate-reservation actions for the floor overlay,
// plus their busy and error state.
export function useTableActions({ selectedTableId, onActionComplete }: UseTableActionsOptions) {
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const clearActionError = useCallback(() => setActionError(null), [])

  const runTableAction = useCallback(
    async (request: () => Promise<Response>, fallbackMsg: string) => {
      setActionBusy(true)
      setActionError(null)
      try {
        const res = await request()
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { detail?: string } | null
          throw new Error(body?.detail ?? fallbackMsg)
        }
        await onActionComplete()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : fallbackMsg)
      } finally {
        setActionBusy(false)
      }
    },
    [onActionComplete],
  )

  const handleOpenTable = useCallback(
    (guestCount: number) => {
      if (!selectedTableId) return
      void runTableAction(
        () =>
          apiFetch(`/api/orders/sessions/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ table: selectedTableId, guest_count: guestCount }),
          }),
        "Failed to open table",
      )
    },
    [selectedTableId, runTableAction],
  )

  const handleActivateReservation = useCallback(
    (reservationId: string) => {
      void runTableAction(
        () =>
          apiFetch(`/api/reservations/reservations/${reservationId}/activate/`, {
            method: "POST",
          }),
        "Failed to activate reservation",
      )
    },
    [runTableAction],
  )

  return { actionBusy, actionError, handleOpenTable, handleActivateReservation, clearActionError }
}
