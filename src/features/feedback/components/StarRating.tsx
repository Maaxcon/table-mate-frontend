import { LuStar } from "react-icons/lu"

type StarRatingProps = {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: number
  label?: string
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 24,
  label,
}: StarRatingProps) {
  return (
    <span className="star-rating" role={readonly ? "img" : "radiogroup"} aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value
        const half = !filled && star - 0.5 <= value
        return (
          <button
            key={star}
            type="button"
            className={`star-rating__star${filled ? " star-rating__star--filled" : ""}${half ? " star-rating__star--half" : ""}`}
            onClick={() => onChange?.(star)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" && value < 5) onChange?.(value + 1)
              if (e.key === "ArrowLeft" && value > 1) onChange?.(value - 1)
            }}
            disabled={readonly}
            role={readonly ? "presentation" : "radio"}
            aria-checked={readonly ? undefined : filled}
            aria-label={readonly ? undefined : `${star} star${star > 1 ? "s" : ""}`}
            tabIndex={readonly ? -1 : 0}
            style={{ width: size, height: size }}
          >
            <LuStar size={size} fill={filled ? "currentColor" : "none"} />
          </button>
        )
      })}
    </span>
  )
}
