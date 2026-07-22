import { useCallback, useState } from "react"
import { apiFetch } from "@/api/client"

type UseTableActionsOptions = {
  selectedTableId: string | null
  // Run after an action succeeds — e.g. refresh the floor and close the overlay.
  onActionComplete: () => void | Promise<void>
  errorMessages?: {
    openTable: string
    activateReservation: string
    closeCheck: string
    processPayment: string
  }
}

// Owns the open-table / activate-reservation actions for the floor overlay,
// plus their busy and error state.
export function useTableActions({
  selectedTableId,
  onActionComplete,
  errorMessages,
}: UseTableActionsOptions) {
  const [actionBusy, setActionBusy] = useState(false)
  // Identifies which row triggered the in-flight action (e.g. a reservation
  // being activated) so only that row shows a spinner — actionBusy still
  // disables the rest to block concurrent submits.
  const [busyActionId, setBusyActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const clearActionError = useCallback(() => setActionError(null), [])

  const messages = errorMessages ?? {
    openTable: "Failed to open table",
    activateReservation: "Failed to activate reservation",
    closeCheck: "Failed to close the check",
    processPayment: "Failed to process payment",
  }

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
        messages.openTable,
      )
    },
    [selectedTableId, runTableAction, messages.openTable],
  )

  const handleActivateReservation = useCallback(
    (reservationId: string) => {
      void runTableAction(
        () =>
          apiFetch(`/api/reservations/reservations/${reservationId}/activate/`, {
            method: "POST",
          }),
        messages.activateReservation,
        reservationId,
      )
    },
    [runTableAction, messages.activateReservation],
  )

  // Close the check (end the visit). No payment step yet: this closes the
  // session, completes the reservation, and closes the cart so the table frees.
  const handleCloseCheck = useCallback(
    (sessionId: string) => {
      void runTableAction(
        () => apiFetch(`/api/orders/sessions/${sessionId}/close/`, { method: "POST" }),
        messages.closeCheck,
      )
    },
    [runTableAction, messages.closeCheck],
  )

  // Simulated payment: marks the selected ordered items as paid. Same
  // simulated flow as the guest cart's bill, just staff-triggered.
  const handleProcessPayment = useCallback(
    (sessionId: string, orderItemIds: string[]) => {
      void runTableAction(
        () =>
          apiFetch(`/api/orders/sessions/${sessionId}/pay/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_item_ids: orderItemIds }),
          }),
        messages.processPayment,
      )
    },
    [runTableAction, messages.processPayment],
  )

  return {
    actionBusy,
    busyActionId,
    actionError,
    handleOpenTable,
    handleActivateReservation,
    handleCloseCheck,
    handleProcessPayment,
    clearActionError,
  }
}
