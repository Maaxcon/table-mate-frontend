import { api, type Paginated } from "@/api/client"
import type {
  AdminFeedbackFilters,
  AdminFeedbackListResponse,
  AdminFeedbackResponse,
  FeedbackCreateRequest,
  FeedbackResponse,
} from "./types"

export function createFeedback(
  body: FeedbackCreateRequest,
  accessToken?: string,
): Promise<FeedbackResponse> {
  return api.post<FeedbackResponse>("/api/feedback/", body, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  })
}

export function fetchMyFeedback(signal?: AbortSignal): Promise<FeedbackResponse[]> {
  return api.getAllList<FeedbackResponse>("/api/feedback/my/", { signal })
}

export function fetchMyFeedbackDetail(publicId: string): Promise<FeedbackResponse> {
  return api.get<FeedbackResponse>(`/api/feedback/my/${publicId}/`)
}

export function updateMyFeedback(
  publicId: string,
  body: FeedbackCreateRequest,
): Promise<FeedbackResponse> {
  return api.patch<FeedbackResponse>(`/api/feedback/my/${publicId}/`, body)
}

export function deleteMyFeedback(publicId: string): Promise<void> {
  return api.del(`/api/feedback/my/${publicId}/`)
}

export function fetchAdminFeedbackList(
  filters?: AdminFeedbackFilters,
  signal?: AbortSignal,
): Promise<Paginated<AdminFeedbackListResponse>> {
  return api.get<Paginated<AdminFeedbackListResponse>>("/api/feedback/admin/", {
    query: filters as Record<string, string | number | boolean | undefined>,
    signal,
  })
}

export function fetchAdminFeedbackDetail(publicId: string): Promise<AdminFeedbackResponse> {
  return api.get<AdminFeedbackResponse>(`/api/feedback/admin/${publicId}/`)
}
