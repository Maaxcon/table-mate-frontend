import { useCallback, useState } from "react"

/**
 * Guards closing a modal that has unsaved edits. Call `requestClose` from the
 * modal's close paths (backdrop, Esc, ✕): if `dirty`, it asks for confirmation
 * instead of closing. Pair `confirming` with a `<DiscardChangesDialog>`.
 */
export function useUnsavedGuard(dirty: boolean, onClose: () => void) {
  const [confirming, setConfirming] = useState(false)

  const requestClose = useCallback(() => {
    if (dirty) setConfirming(true)
    else onClose()
  }, [dirty, onClose])

  const keepEditing = useCallback(() => setConfirming(false), [])

  return {
    /** True while the discard confirmation is showing. */
    confirming,
    /** Use as the modal's `onClose` — prompts when there are unsaved edits. */
    requestClose,
    /** Confirm handler: actually closes. */
    discard: onClose,
    /** Cancel handler: dismisses the prompt, keeps the modal open. */
    keepEditing,
  }
}
