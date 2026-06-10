import ConfirmDialog from "@/features/admin/components/ConfirmDialog"

type DiscardChangesDialogProps = {
  onConfirm: () => void
  onClose: () => void
}

/** Standard "you have unsaved edits" prompt, shared by the form modals. */
function DiscardChangesDialog({ onConfirm, onClose }: DiscardChangesDialogProps) {
  return (
    <ConfirmDialog
      title="Discard changes?"
      message="You have unsaved changes. Close without saving?"
      confirmLabel="Discard"
      tone="danger"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}

export default DiscardChangesDialog
