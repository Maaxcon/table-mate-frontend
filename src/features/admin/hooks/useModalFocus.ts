import { useEffect, useRef } from "react"

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ")

// Hidden elements (e.g. the dish photo's hidden file input) report no layout box.
const isVisible = (el: HTMLElement) => el.offsetParent !== null

/**
 * Focus management for a modal dialog. Attach the returned ref to the dialog
 * container. While `active` is true it:
 * - moves focus to the first form field (or first focusable element) on open,
 * - keeps Tab / Shift+Tab inside the dialog (focus trap),
 * - restores focus to the element that was focused before opening, on close.
 *
 * We focus via ref here instead of the `autofocus` attribute, which the a11y
 * linter forbids.
 */
export function useModalFocus<T extends HTMLElement = HTMLDivElement>(active = true) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const node = ref.current
    if (!active || !node) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    // Prefer the first real form field, fall back to any focusable element
    // (e.g. the Cancel button in a confirm dialog with no fields).
    const fields = Array.from(node.querySelectorAll<HTMLElement>("input, select, textarea")).filter(
      isVisible,
    )
    const firstFocusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      isVisible,
    )[0]
    ;(fields[0] ?? firstFocusable)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const current = document.activeElement
      if (e.shiftKey) {
        if (current === first || !node.contains(current)) {
          e.preventDefault()
          last.focus()
        }
      } else if (current === last || !node.contains(current)) {
        e.preventDefault()
        first.focus()
      }
    }

    node.addEventListener("keydown", onKeyDown)
    return () => {
      node.removeEventListener("keydown", onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [active])

  return ref
}
