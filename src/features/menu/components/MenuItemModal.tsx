import { useEffect } from "react"
import type { MenuItem } from "@/types/menu"
import { formatPrice } from "../utils"
import "./MenuItemModal.css"

type MenuItemModalProps = {
  item: MenuItem
  onClose: () => void
}

function MenuItemModal({ item, onClose }: MenuItemModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="menu-modal__overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
      }}
    >
      <div className="menu-modal" role="dialog" aria-modal="true">
        <div className="menu-modal__header">
          <h2 className="menu-modal__name">{item.name}</h2>
          <button className="menu-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {item.description && <p className="menu-modal__description">{item.description}</p>}

        <div className="menu-modal__footer">
          <span className="menu-modal__price">{formatPrice(item.price)}</span>
          <span
            className={`menu-modal__badge${item.is_available ? " menu-modal__badge--available" : " menu-modal__badge--unavailable"}`}
          >
            {item.is_available ? "Available" : "Unavailable"}
          </span>
        </div>
      </div>
    </div>
  )
}

export default MenuItemModal
