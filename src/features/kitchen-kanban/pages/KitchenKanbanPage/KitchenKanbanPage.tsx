import { useCallback, useEffect, useMemo, useState } from "react"
import "./KitchenKanbanPage.css"
import { onKitchenEvent } from "@/features/notification-stream/kitchenEventBus"
import { useAppSelector } from "@/store/hooks"
import {
  fetchTickets,
  fetchCompletedTickets,
  fetchOrderItems,
  fetchTicketStats,
  updateTicketStatus,
  updateOrderItemStatus,
} from "../../api"
import type { BatchCount, KanbanTicket } from "../../types"
import { elapsedMinutes, mapItem, mapTicket, mapTicketShort } from "../../utils"
import { KanbanHeader } from "../../components/KanbanHeader"
import { IncomingColumn } from "../../components/IncomingColumn"
import { ActiveColumn } from "../../components/ActiveColumn"
import { BatchColumn } from "../../components/BatchColumn"
import { CompletedColumn } from "../../components/CompletedColumn"
import { NotificationsPanel } from "../../components/NotificationsPanel"
import { KanbanFooter } from "../../components/KanbanFooter"
import { useNotificationStream } from "@/features/notification-stream/hooks/useNotificationStream"
import { useAdminStrings } from "@/features/admin/strings"
const KITCHEN_READ_STORAGE_KEY = "tablemate.kitchen.notifications.read"

function useCurrentTime(locale: string): string {
  const format = () =>
    new Date().toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  const [time, setTime] = useState(format)
  useEffect(() => {
    const id = setInterval(() => {
      setTime(format())
    }, 1000)
    return () => clearInterval(id)
  }, [locale])
  return time
}

export function KitchenKanbanPage() {
  const strings = useAdminStrings()
  const pageStrings = strings.kitchen.page
  const mutationStrings = pageStrings.mutations
  const currentTime = useCurrentTime(strings.locale)
  const { events, isConnected, markEventRead, markAllRead } = useNotificationStream({
    readStorageKey: KITCHEN_READ_STORAGE_KEY,
  })
  const [tick, setTick] = useState(0)
  const [tickets, setTickets] = useState<KanbanTicket[]>([])
  const [completed, setCompleted] = useState<KanbanTicket[]>([])
  const [avgPrepTimeSeconds, setAvgPrepTimeSeconds] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const userRole = useAppSelector((state) => state.auth.user?.role)
  const canManageTickets = userRole === "cook" || userRole === "admin"

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    return onKitchenEvent(() => setTick((t) => t + 1))
  }, [])

  useEffect(() => {
    if (!mutationError) return
    const id = setTimeout(() => setMutationError(null), 5000)
    return () => clearTimeout(id)
  }, [mutationError])

  useEffect(() => {
    const abort = new AbortController()

    async function load() {
      try {
        const [incoming, active, completedList, stats] = await Promise.all([
          fetchTickets("incoming", abort.signal),
          fetchTickets("active", abort.signal),
          fetchCompletedTickets(abort.signal),
          fetchTicketStats(abort.signal),
        ])

        const allActive = [...incoming, ...active]

        const itemsByOrder = await Promise.all(
          allActive.map((t) => fetchOrderItems(t.order, abort.signal)),
        )

        setTickets(allActive.map((t, i) => mapTicket(t, itemsByOrder[i])))
        setCompleted(completedList.map(mapTicketShort))
        setAvgPrepTimeSeconds(stats.avg_prep_time_seconds)
        setError(null)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        console.error(err)
        setError(pageStrings.loadError)
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => abort.abort()
  }, [tick])

  const toggleItem = useCallback(
    async (ticketId: string, itemId: string) => {
      if (!canManageTickets) return
      const ticket = tickets.find((t) => t.id === ticketId)
      const item = ticket?.items.find((it) => it.id === itemId)
      if (!item) return

      const newStatus = item.status === "ready" ? "pending" : "ready"
      try {
        const updated = await updateOrderItemStatus(itemId, newStatus)
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? { ...t, items: t.items.map((it) => (it.id === itemId ? mapItem(updated) : it)) }
              : t,
          ),
        )
      } catch (err) {
        console.error(err)
        setMutationError(mutationStrings.update)
      }
    },
    [tickets, canManageTickets, mutationStrings],
  )

  const bumpOrder = useCallback(
    async (ticketId: string) => {
      if (!canManageTickets) return
      const ticket = tickets.find((t) => t.id === ticketId)
      if (!ticket) return
      if (!ticket.items.every((it) => it.status === "ready")) return

      try {
        await updateTicketStatus(ticketId, "completed")
        setCompleted((c) => [
          {
            ...ticket,
            status: "completed",
            completedMinutes: elapsedMinutes(ticket.startedAt),
            completedAt: Date.now(),
          },
          ...c,
        ])
        setTickets((prev) => prev.filter((t) => t.id !== ticketId))
      } catch (err) {
        console.error(err)
        setMutationError(mutationStrings.bump)
      }
    },
    [tickets, canManageTickets, mutationStrings],
  )

  const promoteToActive = useCallback(
    async (ticketId: string) => {
      if (!canManageTickets) return
      try {
        await updateTicketStatus(ticketId, "active")
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: "active" } : t)))
      } catch (err) {
        console.error(err)
        setMutationError(mutationStrings.accept)
      }
    },
    [canManageTickets, mutationStrings],
  )

  const incoming = useMemo(
    () => tickets.filter((t) => t.status === "incoming").sort((a, b) => a.startedAt - b.startedAt),
    [tickets],
  )
  const active = useMemo(
    () => tickets.filter((t) => t.status === "active").sort((a, b) => a.startedAt - b.startedAt),
    [tickets],
  )

  const batchCounts = useMemo<BatchCount[]>(() => {
    const counts = new Map<string, { label: string; count: number; color: string }>()
    for (const t of tickets) {
      if (t.status !== "active") continue
      for (const item of t.items) {
        if (item.status === "ready") continue
        const key = item.name.toLowerCase()
        const existing = counts.get(key)
        if (existing) {
          existing.count += item.quantity
        } else {
          counts.set(key, {
            label: item.name,
            count: item.quantity,
            color: item.categoryColor,
          })
        }
      }
    }
    return Array.from(counts.values())
      .map(({ label, count, color }) => ({ label, count, color }))
      .sort((a, b) => b.count - a.count)
  }, [tickets])

  if (error) {
    return (
      <div className="kanban">
        <KanbanHeader currentTime={currentTime} isConnected={isConnected} />
        <div className="kanban__error">{error}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="kanban">
        <KanbanHeader currentTime={currentTime} isConnected={isConnected} />
        <div className="kanban__loading">{pageStrings.loading}</div>
      </div>
    )
  }

  return (
    <div className="kanban">
      <KanbanHeader currentTime={currentTime} isConnected={isConnected} />

      <div className="kanban__toast-region" role="status" aria-live="polite">
        {mutationError && <div className="kanban__toast">{mutationError}</div>}
      </div>

      <div className="kanban__columns">
        <IncomingColumn
          tickets={incoming}
          onPromote={promoteToActive}
          canManage={canManageTickets}
        />
        <ActiveColumn
          tickets={active}
          onToggleItem={toggleItem}
          onBump={bumpOrder}
          canManage={canManageTickets}
        />
        <BatchColumn batches={batchCounts} />
        <div className="kanban__right">
          <CompletedColumn tickets={completed} />
          <NotificationsPanel
            events={events}
            isConnected={isConnected}
            markEventRead={markEventRead}
            markAllRead={markAllRead}
          />
        </div>
      </div>

      <KanbanFooter
        incomingCount={incoming.length}
        activeCount={active.length}
        completedCount={completed.length}
        avgPrepTimeSeconds={avgPrepTimeSeconds}
      />
    </div>
  )
}
