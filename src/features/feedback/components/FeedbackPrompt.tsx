import { createPortal } from "react-dom"
import { LuMessageSquare, LuX } from "react-icons/lu"
import { useTranslation } from "react-i18next"

type FeedbackPromptProps = {
  onOpenFeedback: () => void
  onDismiss: () => void
  onNotNow: () => void
}

export function FeedbackPrompt({ onOpenFeedback, onDismiss, onNotNow }: FeedbackPromptProps) {
  const { t } = useTranslation()

  return createPortal(
    <div className="feedback-prompt">
      <div className="feedback-prompt__card">
        <button
          type="button"
          className="feedback-prompt__close"
          onClick={onDismiss}
          aria-label={t("feedback.dismissPrompt")}
        >
          <LuX size={14} />
        </button>
        <LuMessageSquare className="feedback-prompt__icon" size={20} />
        <p className="feedback-prompt__text">{t("feedback.visitQuestion")}</p>
        <div className="feedback-prompt__actions">
          <button
            type="button"
            className="feedback-prompt__btn feedback-prompt__btn--primary"
            onClick={onOpenFeedback}
          >
            {t("feedback.leaveFeedback")}
          </button>
          <button
            type="button"
            className="feedback-prompt__btn feedback-prompt__btn--secondary"
            onClick={onNotNow}
          >
            {t("feedback.notNow")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
