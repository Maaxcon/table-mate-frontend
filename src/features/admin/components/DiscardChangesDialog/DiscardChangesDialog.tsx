import ConfirmDialog from "@/features/admin/components/ConfirmDialog"
import { useAdminStrings } from "@/features/admin/strings"

type DiscardChangesDialogProps = {
  onConfirm: () => void
  onClose: () => void
}

/** Standard "you have unsaved edits" prompt, shared by the form modals. */
function DiscardChangesDialog({ onConfirm, onClose }: DiscardChangesDialogProps) {
  const strings = useAdminStrings()
  return (
    <ConfirmDialog
      title={strings.forms.discard.title}
      message={strings.forms.discard.message}
      confirmLabel={strings.forms.discard.confirm}
      tone="danger"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}

export default DiscardChangesDialog
