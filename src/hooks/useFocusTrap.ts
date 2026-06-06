import { useEffect, useRef } from "react"

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ")

// Hidden elements (display:none, the dish photo's hidden file input, etc.)
// report no client rects, so they're skipped for focusing/cycling.
const isVisible = (el: HTMLElement) => el.tabIndex !== -1 && el.getClientRects().length > 0

// Tracks stacked traps so only the topmost dialog reacts to keys.
const trapStack: symbol[] = []

type FocusTrapOptions = {
  /** When false the trap is suspended (e.g. a dialog stacked on top). Default true. */
  active?: boolean
  /** If provided, Escape calls it (only while this trap is topmost). */
  onEscape?: () => void
  /** Focus the first form field (input/select/textarea) before other controls. */
  preferFields?: boolean
}

/**
 * Focus management for a dialog. Attach the returned ref to the dialog
 * container. While active it focuses the first control (or first field), keeps
 * Tab / Shift+Tab inside the dialog, optionally closes on Escape, and restores
 * focus to the previously focused element on close. Nested dialogs stack, so
 * only the topmost one handles keys.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(options: FocusTrapOptions = {}) {
  const { active = true, onEscape, preferFields = false } = options
  const ref = useRef<T>(null)

  // Keep the latest onEscape without re-running the effect.
  const onEscapeRef = useRef(onEscape)
  useEffect(() => {
    onEscapeRef.current = onEscape
  })

  useEffect(() => {
    const node = ref.current
    if (!active || !node) return

    const token = Symbol("focus-trap")
    trapStack.push(token)
    const isTopmost = () => trapStack[trapStack.length - 1] === token

    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible)

    // Initial focus: first field (when asked), else first control, else the node.
    const field = preferFields
      ? Array.from(node.querySelectorAll<HTMLElement>("input, select, textarea")).filter(
          isVisible,
        )[0]
      : undefined
    ;(field ?? focusables()[0] ?? node).focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTopmost()) return
      if (e.key === "Escape") {
        onEscapeRef.current?.()
        return
      }
      if (e.key !== "Tab") return
      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (e.shiftKey && (current === first || !node.contains(current))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (current === last || !node.contains(current))) {
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
  }, [active, preferFields])

  return ref
}
