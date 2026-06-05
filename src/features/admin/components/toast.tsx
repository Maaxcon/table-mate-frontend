import { useCallback, useMemo, useState, type ReactNode } from "react"
import { LuCircleAlert, LuCircleCheck, LuX } from "react-icons/lu"
import { ToastContext } from "./toastContext"
import "./toast.css"

type ToastType = "success" | "error"
type Toast = { id: number; type: ToastType; message: string }

const DISMISS_MS = 3500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, type, message }])
      window.setTimeout(() => remove(id), DISMISS_MS)
    },
    [remove],
  )

  const success = useCallback((message: string) => push("success", message), [push])
  const error = useCallback((message: string) => push("error", message), [push])

  // Stable reference so consumers' effects don't re-fire on every toast change.
  const value = useMemo(() => ({ success, error }), [success, error])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.type}`}
            role={t.type === "error" ? "alert" : "status"}
          >
            <span className="toast__icon" aria-hidden="true">
              {t.type === "success" ? <LuCircleCheck /> : <LuCircleAlert />}
            </span>
            <span className="toast__message">{t.message}</span>
            <button
              type="button"
              className="toast__close"
              aria-label="Dismiss"
              onClick={() => remove(t.id)}
            >
              <LuX aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
