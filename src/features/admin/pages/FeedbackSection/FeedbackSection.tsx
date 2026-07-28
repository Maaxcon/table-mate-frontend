import { useCallback, useEffect, useMemo, useState } from "react"
import { LuCircleCheck, LuFilter, LuLoaderCircle, LuSearch } from "react-icons/lu"
import { useToast } from "@/features/admin/hooks/toastContext"
import Modal from "@/features/admin/components/Modal"
import { StarRating } from "@/features/feedback/components/StarRating"
import {
  fetchAdminFeedbackList,
  fetchAdminFeedbackDetail,
  updateFeedbackReviewStatus,
} from "@/features/feedback/api"
import type {
  AdminFeedbackListResponse,
  AdminFeedbackResponse,
  AdminFeedbackFilters,
} from "@/features/feedback/types"
import type { Paginated } from "@/api/client"
import "./FeedbackSection.css"

const REVIEW_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "resolved", label: "Resolved" },
] as const

const STATUS_COLORS: Record<string, string> = {
  new: "status-badge--new",
  reviewed: "status-badge--reviewed",
  resolved: "status-badge--resolved",
}

const INITIAL_FILTERS: AdminFeedbackFilters = {}

function FeedbackSection() {
  const toast = useToast()

  const [data, setData] = useState<Paginated<AdminFeedbackListResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<AdminFeedbackFilters>(INITIAL_FILTERS)
  const [search, setSearch] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<AdminFeedbackResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchAdminFeedbackList(filters)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load feedback")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [filters])

  const handleFilterChange = (key: keyof AdminFeedbackFilters, value: string | undefined) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (value === "" || value === undefined) {
        delete next[key]
      } else {
        ;(next as Record<string, unknown>)[key] = value
      }
      return next
    })
  }

  const handleSelectFeedback = useCallback(
    async (publicId: string) => {
      setSelectedId(publicId)
      setDetailLoading(true)
      setSelectedDetail(null)
      try {
        const detail = await fetchAdminFeedbackDetail(publicId)
        setSelectedDetail(detail)
      } catch {
        toast.error("Could not load feedback detail")
      } finally {
        setDetailLoading(false)
      }
    },
    [toast],
  )

  const handleUpdateStatus = useCallback(
    async (publicId: string, reviewStatus: "new" | "reviewed" | "resolved") => {
      try {
        const updated = await updateFeedbackReviewStatus(publicId, { review_status: reviewStatus })
        setSelectedDetail(updated)
        setData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            results: prev.results.map((r) =>
              r.public_id === publicId ? { ...r, review_status: reviewStatus } : r,
            ),
          }
        })
        toast.success("Status updated")
      } catch {
        toast.error("Failed to update status")
      }
    },
    [toast],
  )

  const filteredResults = useMemo(() => {
    if (!data?.results) return []
    if (!search.trim()) return data.results
    const q = search.toLowerCase()
    return data.results.filter((r) => r.public_id.toLowerCase().includes(q))
  }, [data, search])

  return (
    <section className="admin-section">
      <header className="admin-section__header">
        <h1 className="admin-section__title">Feedback</h1>
        <p className="admin-section__description">
          View and manage guest feedback for your restaurant.
        </p>
      </header>

      <div className="feedback-toolbar">
        <div className="feedback-toolbar__search">
          <LuSearch className="feedback-toolbar__search-icon" size={16} />
          <input
            type="search"
            placeholder="Search by ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="feedback-toolbar__search-input"
          />
        </div>
        <button
          type="button"
          className={`feedback-toolbar__filter-btn${filterOpen ? " feedback-toolbar__filter-btn--active" : ""}`}
          onClick={() => setFilterOpen((p) => !p)}
        >
          <LuFilter size={16} />
          Filters
        </button>
      </div>

      {filterOpen && (
        <div className="feedback-filters">
          <select
            value={filters.review_status ?? ""}
            onChange={(e) => handleFilterChange("review_status", e.target.value)}
            className="feedback-filters__select"
          >
            {REVIEW_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={filters.overall_rating ?? ""}
            onChange={(e) => handleFilterChange("overall_rating", e.target.value || undefined)}
            className="feedback-filters__select"
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) => handleFilterChange("date_from", e.target.value || undefined)}
            className="feedback-filters__date"
            placeholder="From"
          />
          <input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) => handleFilterChange("date_to", e.target.value || undefined)}
            className="feedback-filters__date"
            placeholder="To"
          />
        </div>
      )}

      {loading ? (
        <div className="feedback-loading">
          <LuLoaderCircle className="feedback-loading__spinner" size={24} />
        </div>
      ) : error ? (
        <p className="feedback-error">{error}</p>
      ) : filteredResults.length === 0 ? (
        <p className="feedback-empty">No feedback yet.</p>
      ) : (
        <div className="feedback-table-wrap">
          <table className="feedback-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Guest</th>
                <th>Overall</th>
                <th>Service</th>
                <th>Status</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((entry) => (
                <tr
                  key={entry.public_id}
                  className={`feedback-row${selectedId === entry.public_id ? " feedback-row--active" : ""}`}
                  onClick={() => void handleSelectFeedback(entry.public_id)}
                >
                  <td className="feedback-cell feedback-cell--date">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="feedback-cell feedback-cell--guest">
                    {entry.guest ? `${entry.guest.slice(0, 8)}...` : "Guest"}
                  </td>
                  <td className="feedback-cell">
                    <StarRating value={entry.overall_rating} readonly size={14} />
                  </td>
                  <td className="feedback-cell">
                    <StarRating value={entry.service_rating} readonly size={14} />
                  </td>
                  <td className="feedback-cell">
                    <span className={`status-badge ${STATUS_COLORS[entry.review_status] ?? ""}`}>
                      {entry.review_status}
                    </span>
                  </td>
                  <td className="feedback-cell feedback-cell--comment">
                    {entry.comment ? (
                      <span className="feedback-comment-preview">
                        {entry.comment.length > 60
                          ? `${entry.comment.slice(0, 60)}...`
                          : entry.comment}
                      </span>
                    ) : (
                      <span className="feedback-no-comment">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <Modal
          title="Feedback detail"
          onClose={() => {
            setSelectedId(null)
            setSelectedDetail(null)
          }}
          className="feedback-detail-modal"
        >
          {detailLoading ? (
            <div className="feedback-detail-loading">
              <LuLoaderCircle className="feedback-loading__spinner" size={24} />
            </div>
          ) : selectedDetail ? (
            <div className="feedback-detail">
              <div className="feedback-detail__grid">
                <div className="feedback-detail__field">
                  <span className="feedback-detail__label">Guest</span>
                  <span className="feedback-detail__value">{selectedDetail.guest ?? "Guest"}</span>
                </div>
                <div className="feedback-detail__field">
                  <span className="feedback-detail__label">Order</span>
                  <span className="feedback-detail__value">{selectedDetail.order}</span>
                </div>
                <div className="feedback-detail__field">
                  <span className="feedback-detail__label">Date</span>
                  <span className="feedback-detail__value">
                    {new Date(selectedDetail.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="feedback-detail__field">
                  <span className="feedback-detail__label">Status</span>
                  <div className="feedback-detail__status-actions">
                    {(["new", "reviewed", "resolved"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`status-btn${selectedDetail.review_status === status ? " status-btn--active" : ""}`}
                        onClick={() => void handleUpdateStatus(selectedDetail.public_id, status)}
                      >
                        {status === "resolved" && <LuCircleCheck size={14} />}
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="feedback-detail__ratings">
                <div className="feedback-detail__rating-row">
                  <span className="feedback-detail__label">Overall</span>
                  <StarRating value={selectedDetail.overall_rating} readonly size={20} />
                </div>
                <div className="feedback-detail__rating-row">
                  <span className="feedback-detail__label">Service</span>
                  <StarRating value={selectedDetail.service_rating} readonly size={20} />
                </div>
              </div>

              {selectedDetail.comment && (
                <div className="feedback-detail__comment">
                  <span className="feedback-detail__label">Comment</span>
                  <p className="feedback-detail__comment-text">{selectedDetail.comment}</p>
                </div>
              )}

              {selectedDetail.dish_feedback.length > 0 && (
                <div className="feedback-detail__dishes">
                  <span className="feedback-detail__label">Dish ratings</span>
                  <ul className="feedback-detail__dish-list">
                    {selectedDetail.dish_feedback.map((df) => (
                      <li key={df.public_id} className="feedback-detail__dish-item">
                        <span className="feedback-detail__dish-name">
                          {df.menu_item.slice(0, 8)}...
                        </span>
                        <StarRating value={df.rating} readonly size={14} />
                        {df.comment && (
                          <span className="feedback-detail__dish-comment">{df.comment}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="feedback-error">Could not load detail.</p>
          )}
        </Modal>
      )}
    </section>
  )
}

export default FeedbackSection
