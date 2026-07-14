import { api } from "@/api/client"
import type { WSNotificationMessage } from "./types"

const NOTIFICATION_HISTORY_PATH = "/api/staff/notifications/history/"

export function fetchNotificationHistory(signal?: AbortSignal): Promise<WSNotificationMessage[]> {
  return api.getList<WSNotificationMessage>(NOTIFICATION_HISTORY_PATH, {
    signal,
    errorMessage: "Could not load notification history.",
  })
}
