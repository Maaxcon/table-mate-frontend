import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { LuLoaderCircle, LuSend, LuX } from "react-icons/lu"
import { useTranslation } from "react-i18next"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { StarRating } from "./StarRating"
import { createFeedback } from "../api"
import type { FeedbackCreateRequest, FeedbackResponse } from "../types"

export type OrderItemInfo = {
  public_id: string
  name: string
}

type FeedbackModalProps = {
  orderPublicId: string
  /** Items the guest actually ordered, so they can rate each dish. */
  orderItems: OrderItemInfo[]
  /** JWT that created the order, used to verify feedback ownership. */
  accessToken?: string
  /** Optional: entry id if reopening existing feedback */
  existingFeedback?: FeedbackResponse
  onClose: () => void
  onSuccess: (feedback: FeedbackResponse) => void
  onError?: (error: string) => void
}

export function FeedbackModal({
  orderPublicId,
  orderItems,
  accessToken,
  existingFeedback,
  onClose,
  onSuccess,
  onError,
}: FeedbackModalProps) {
  const { t } = useTranslation()
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose })
  const [overallRating, setOverallRating] = useState(existingFeedback?.overall_rating ?? 0)
  const [serviceRating, setServiceRating] = useState(existingFeedback?.service_rating ?? 0)
  const [comment, setComment] = useState(existingFeedback?.comment ?? "")
  const [dishRatings, setDishRatings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    if (existingFeedback?.dish_feedback) {
      for (const df of existingFeedback.dish_feedback) {
        initial[df.menu_item] = df.rating
      }
    }
    return initial
  })
  const [dishComments, setDishComments] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    if (existingFeedback?.dish_feedback) {
      for (const df of existingFeedback.dish_feedback) {
        if (df.comment) initial[df.menu_item] = df.comment
      }
    }
    return initial
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = overallRating > 0 && serviceRating > 0 && !submitting

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const body: FeedbackCreateRequest = {
        order: orderPublicId,
        overall_rating: overallRating,
        service_rating: serviceRating,
        comment: comment || undefined,
        dish_feedback: orderItems
          .filter((item) => dishRatings[item.public_id] != null && dishRatings[item.public_id] > 0)
          .map((item) => ({
            menu_item: item.public_id,
            rating: dishRatings[item.public_id],
            comment: dishComments[item.public_id] || undefined,
          })),
      }
      if (body.dish_feedback?.length === 0) {
        body.dish_feedback = undefined
      }
      const result = await createFeedback(body, accessToken)
      onSuccess(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit feedback"
      setError(message)
      onError?.(message)
    } finally {
      setSubmitting(false)
    }
  }, [
    canSubmit,
    overallRating,
    serviceRating,
    comment,
    dishRatings,
    dishComments,
    orderItems,
    orderPublicId,
    accessToken,
    onSuccess,
    onError,
  ])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return createPortal(
    <div className="feedback-modal__overlay">
      <button
        type="button"
        className="feedback-modal__backdrop"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("feedback.leaveFeedback")}
      >
        <div className="feedback-modal__header">
          <h2 className="feedback-modal__title">{t("feedback.visitQuestion")}</h2>
          <button
            type="button"
            className="feedback-modal__close"
            onClick={onClose}
            aria-label={t("feedback.close")}
          >
            <LuX size={18} />
          </button>
        </div>

        <div className="feedback-modal__body">
          <section className="feedback-modal__section">
            <span className="feedback-modal__label">{t("feedback.overallRating")}</span>
            <StarRating value={overallRating} onChange={setOverallRating} size={28} />
          </section>

          <section className="feedback-modal__section">
            <span className="feedback-modal__label">{t("feedback.serviceRating")}</span>
            <StarRating value={serviceRating} onChange={setServiceRating} size={28} />
          </section>

          <section className="feedback-modal__section">
            <span className="feedback-modal__label">{t("feedback.commentOptional")}</span>
            <textarea
              className="feedback-modal__textarea"
              placeholder={t("feedback.commentPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </section>

          {orderItems.length > 0 && (
            <section className="feedback-modal__section">
              <h3 className="feedback-modal__subtitle">{t("feedback.dishRatingsOptional")}</h3>
              <ul className="feedback-modal__dish-list">
                {orderItems.map((item) => (
                  <li key={item.public_id} className="feedback-modal__dish-item">
                    <div className="feedback-modal__dish-header">
                      <span className="feedback-modal__dish-name">{item.name}</span>
                      <StarRating
                        value={dishRatings[item.public_id] ?? 0}
                        onChange={(val) =>
                          setDishRatings((prev) => ({ ...prev, [item.public_id]: val }))
                        }
                        size={20}
                      />
                    </div>
                    <input
                      className="feedback-modal__dish-comment"
                      type="text"
                      placeholder={t("feedback.commentOptional")}
                      value={dishComments[item.public_id] ?? ""}
                      onChange={(e) =>
                        setDishComments((prev) => ({ ...prev, [item.public_id]: e.target.value }))
                      }
                      maxLength={500}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {error && (
          <p className="feedback-modal__error" role="alert">
            {error}
          </p>
        )}

        <div className="feedback-modal__footer">
          <button
            type="button"
            className="feedback-modal__btn feedback-modal__btn--secondary"
            onClick={onClose}
            disabled={submitting}
          >
            {t("feedback.cancel")}
          </button>
          <button
            type="button"
            className="feedback-modal__btn feedback-modal__btn--primary"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {submitting ? (
              <>
                <LuLoaderCircle className="feedback-modal__spinner" size={16} />
                {t("feedback.submitting")}
              </>
            ) : (
              <>
                <LuSend size={16} />
                {t("feedback.submit")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
