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
  // Identifies which row triggered the in-flight action (e.g. a reservation
  // being activated) so only that row shows a spinner — actionBusy still
  // disables the rest to block concurrent submits.
  const [busyActionId, setBusyActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const clearActionError = useCallback(() => setActionError(null), [])

  const runTableAction = useCallback(
    async (request: () => Promise<Response>, fallbackMsg: string, actionId?: string) => {
      setActionBusy(true)
      setBusyActionId(actionId ?? null)
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
        setBusyActionId(null)
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
        reservationId,
      )
    },
    [runTableAction],
  )

  // Close the check (end the visit). No payment step yet: this closes the
  // session, completes the reservation, and closes the cart so the table frees.
  const handleCloseCheck = useCallback(
    (sessionId: string) => {
      void runTableAction(
        () => apiFetch(`/api/orders/sessions/${sessionId}/close/`, { method: "POST" }),
        "Failed to close the check",
      )
    },
    [runTableAction],
  )

  return {
    actionBusy,
    busyActionId,
    actionError,
    handleOpenTable,
    handleActivateReservation,
    handleCloseCheck,
    clearActionError,
  }
}
