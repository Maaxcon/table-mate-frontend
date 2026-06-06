import { createContext, useContext } from "react"

export type ToastContextValue = {
  success: (message: string) => void
  error: (message: string) => void
  /** A neutral toast with an action button (e.g. "Undo"), shown for longer. */
  action: (message: string, actionLabel: string, onAction: () => void) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}
