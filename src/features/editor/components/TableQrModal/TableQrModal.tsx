import { useEffect, useState } from "react"
import Modal from "@/features/admin/components/Modal"
import { fetchTableQrCode } from "@/features/editor/api"
import { downloadBlob } from "@/utils/downloadBlob"
import "./TableQrModal.css"

interface TableQrModalProps {
  tablePublicId: string
  tableLabel: string
  onClose: () => void
}

export function TableQrModal({ tablePublicId, tableLabel, onClose }: TableQrModalProps) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    fetchTableQrCode(tablePublicId)
      .then((fetchedBlob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(fetchedBlob)
        setBlob(fetchedBlob)
        setImageUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the QR code.")
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [tablePublicId])

  const handleDownload = () => {
    if (!blob) return
    downloadBlob(blob, `table-${tableLabel || tablePublicId}-qr.png`)
  }

  return (
    <Modal title={`QR code — Table ${tableLabel}`} onClose={onClose} className="table-qr-modal">
      {error && <p className="admin-modal__message admin-modal__message--warning">{error}</p>}
      {!error && !imageUrl && <p className="admin-modal__message">Loading...</p>}
      {imageUrl && (
        <div className="table-qr-modal__image-wrap">
          <img
            src={imageUrl}
            alt={`QR code for table ${tableLabel}`}
            className="table-qr-modal__image"
          />
        </div>
      )}
      <div className="admin-modal__actions">
        <button type="button" className="admin-modal__btn" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="admin-modal__btn admin-modal__btn--primary"
          onClick={handleDownload}
          disabled={!blob}
        >
          Download
        </button>
      </div>
    </Modal>
  )
}
