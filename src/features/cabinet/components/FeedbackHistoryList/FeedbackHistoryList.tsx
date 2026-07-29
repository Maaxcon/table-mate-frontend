import { LuMessageSquare } from "react-icons/lu"
import { StarRating } from "@/features/feedback/components/StarRating"
import { useCabinetStrings } from "@/features/cabinet/strings"
import type { FeedbackResponse } from "@/features/feedback/types"
import type { HistoryEntry } from "@/features/cabinet/types"
import { formatDateTime } from "@/features/cabinet/utils"
import "./FeedbackHistoryList.css"

type FeedbackHistoryListProps = {
  feedback: FeedbackResponse[]
  history: HistoryEntry[]
  error: string | null
}

export function FeedbackHistoryList({ feedback, history, error }: FeedbackHistoryListProps) {
  const strings = useCabinetStrings()
  const sorted = [...feedback].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <section className="cabinet-section" aria-labelledby="cabinet-feedback-title">
      <h2 className="cabinet-section__title" id="cabinet-feedback-title">
        {strings.feedback.title}
      </h2>

      {error ? (
        <p className="cabinet-section__empty cabinet-section__empty--error">{error}</p>
      ) : sorted.length === 0 ? (
        <p className="cabinet-section__empty">{strings.feedback.empty}</p>
      ) : (
        <ul className="cabinet-feedback-history">
          {sorted.map((entry) => {
            const receipt = history.find((visit) => visit.orderId === entry.order)
            return (
              <li key={entry.public_id} className="cabinet-feedback-card">
                <LuMessageSquare className="cabinet-feedback-card__icon" aria-hidden="true" />
                <div className="cabinet-feedback-card__body">
                  <div className="cabinet-feedback-card__header">
                    <span className="cabinet-feedback-card__restaurant">
                      {receipt?.restaurantName ?? strings.feedback.restaurantFallback}
                    </span>
                    <time className="cabinet-feedback-card__date" dateTime={entry.created_at}>
                      {formatDateTime(entry.created_at, strings.locale)}
                    </time>
                  </div>
                  <div className="cabinet-feedback-card__ratings">
                    <span>{strings.feedback.overall}</span>
                    <StarRating value={entry.overall_rating} readonly size={14} />
                    <span>{strings.feedback.service}</span>
                    <StarRating value={entry.service_rating} readonly size={14} />
                  </div>
                  {entry.comment && (
                    <p className="cabinet-feedback-card__comment">{entry.comment}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
