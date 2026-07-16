import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { LuCircleAlert, LuCircleCheck, LuInfo, LuX } from "react-icons/lu"
import { ToastContext } from "@/features/admin/hooks/toastContext"
import { useAdminStrings } from "@/features/admin/strings"
import "./toast.css"

type ToastType = "success" | "error" | "info"
type ToastAction = { label: string; onAction: () => void }
type Toast = { id: number; type: ToastType; message: string; action?: ToastAction }

const DISMISS_MS = 3500
const ACTION_DISMISS_MS = 5000

const ICONS: Record<ToastType, typeof LuCircleCheck> = {
  success: LuCircleCheck,
  error: LuCircleAlert,
  info: LuInfo,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const strings = useAdminStrings()

  // Auto-dismiss timer per toast id, so they can be cleared on remove and unmount.
  const timers = useRef(new Map<number, number>())

  const remove = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (type: ToastType, message: string, opts?: { action?: ToastAction; duration?: number }) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, type, message, action: opts?.action }])
      const timer = window.setTimeout(() => remove(id), opts?.duration ?? DISMISS_MS)
      timers.current.set(id, timer)
    },
    [remove],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const success = useCallback((message: string) => push("success", message), [push])
  const error = useCallback((message: string) => push("error", message), [push])
  const action = useCallback(
    (message: string, label: string, onAction: () => void) =>
      push("info", message, { action: { label, onAction }, duration: ACTION_DISMISS_MS }),
    [push],
  )

  // Stable reference so consumers' effects don't re-fire on every toast change.
  const value = useMemo(() => ({ success, error, action }), [success, error, action])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="toast-stack"
        role="region"
        aria-live="polite"
        aria-label={strings.toast.regionLabel}
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type]
          return (
            <div
              key={t.id}
              className={`toast toast--${t.type}`}
              role={t.type === "error" ? "alert" : "status"}
            >
              <span className="toast__icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="toast__message">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="toast__action"
                  onClick={() => {
                    t.action!.onAction()
                    remove(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                className="toast__close"
                aria-label={strings.toast.dismiss}
                onClick={() => remove(t.id)}
              >
                <LuX aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
