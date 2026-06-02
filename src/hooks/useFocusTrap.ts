import { useEffect, useRef } from "react"

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const trapStack: symbol[] = []

export function useFocusTrap<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const token = Symbol("focus-trap")
    trapStack.push(token)
    const isTopmost = () => trapStack[trapStack.length - 1] === token

    const previouslyFocused = document.activeElement as HTMLElement | null
    const visibleFocusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.tabIndex !== -1 && el.getClientRects().length > 0,
      )

    // Focus the first control, or the dialog itself as a fallback.
    ;(visibleFocusables()[0] ?? node).focus()

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore keys while a dialog is stacked on top of this one.
      if (!isTopmost()) return
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key !== "Tab") return
      const items = visibleFocusables()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      const i = trapStack.lastIndexOf(token)
      if (i !== -1) trapStack.splice(i, 1)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return ref
}
