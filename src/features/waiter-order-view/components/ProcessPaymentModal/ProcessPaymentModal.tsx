import { useMemo, useState } from "react"
import { LuCheck } from "react-icons/lu"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import type { OverlayOrderItem } from "../../types"
import { useWaiterStrings } from "../../strings"
import "./ProcessPaymentModal.css"

interface ProcessPaymentModalProps {
  // Unpaid, non-voided items only — the caller filters.
  items: OverlayOrderItem[]
  currencySymbol: string
  busy?: boolean
  error?: string | null
  onConfirm: (orderItemIds: string[]) => void
  onClose: () => void
}

type Group = { slot: number; label: string; items: OverlayOrderItem[] }

export function ProcessPaymentModal({
  items,
  currencySymbol,
  busy = false,
  error = null,
  onConfirm,
  onClose,
}: ProcessPaymentModalProps) {
  const waiterStrings = useWaiterStrings()
  const strings = waiterStrings.payModal
  const overlayStrings = waiterStrings.overlay
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.map((i) => i.public_id)),
  )
  const dialogRef = useFocusTrap<HTMLDivElement>({
    onEscape: () => {
      if (!busy) onClose()
    },
  })

  const groups = useMemo(() => {
    const map = new Map<number, Group>()
    for (const item of items) {
      let group = map.get(item.guest_slot)
      if (!group) {
        group = {
          slot: item.guest_slot,
          label: item.guest_display_name ?? overlayStrings.guestSlot(item.guest_slot),
          items: [],
        }
        map.set(item.guest_slot, group)
      }
      group.items.push(item)
    }
    return Array.from(map.values()).sort((a, b) => a.slot - b.slot)
  }, [items, overlayStrings])

  const allSelected = items.length > 0 && selected.size === items.length
  const selectedTotal = items
    .filter((i) => selected.has(i.public_id))
    .reduce((sum, i) => sum + (Number.parseFloat(i.payable) || 0), 0)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.public_id)))
  }

  return (
    <div
      className="pay-modal"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="pay-modal__dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-modal-title"
      >
        <div className="pay-modal__header">
          <h2 id="pay-modal-title" className="pay-modal__title">
            {strings.title}
          </h2>
          <button
            type="button"
            className="pay-modal__close"
            onClick={onClose}
            disabled={busy}
            aria-label={waiterStrings.common.close}
          >
            &times;
          </button>
        </div>

        <div className="pay-modal__body">
          {items.length === 0 ? (
            <p className="pay-modal__empty">{strings.empty}</p>
          ) : (
            <>
              <button
                type="button"
                className="pay-modal__selectall"
                onClick={toggleAll}
                aria-pressed={allSelected}
                disabled={busy}
              >
                <span className="pay-modal__checkbox" data-checked={allSelected}>
                  {allSelected && <LuCheck size={12} />}
                </span>
                {strings.selectAll}
              </button>
              {groups.map((group) => (
                <div key={group.slot} className="pay-modal__group">
                  <span className="pay-modal__group-label">{group.label}</span>
                  <ul className="pay-modal__list">
                    {group.items.map((item) => {
                      const checked = selected.has(item.public_id)
                      return (
                        <li key={item.public_id}>
                          <button
                            type="button"
                            className={`pay-modal__item${checked ? " pay-modal__item--checked" : ""}`}
                            onClick={() => toggle(item.public_id)}
                            aria-pressed={checked}
                            disabled={busy}
                          >
                            <span className="pay-modal__checkbox" data-checked={checked}>
                              {checked && <LuCheck size={12} />}
                            </span>
                            <span className="pay-modal__item-name">
                              {item.quantity}&times; {item.name}
                            </span>
                            <span className="pay-modal__item-price">
                              {currencySymbol}
                              {item.payable}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </>
          )}
          {error && (
            <p className="pay-modal__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="pay-modal__footer">
          <div className="pay-modal__total-row">
            <span>{strings.selectedTotal}</span>
            <span>
              {currencySymbol}
              {selectedTotal.toFixed(2)}
            </span>
          </div>
          <div className="pay-modal__actions">
            <button type="button" className="pay-modal__btn" onClick={onClose} disabled={busy}>
              {waiterStrings.common.cancel}
            </button>
            <button
              type="button"
              className="pay-modal__btn pay-modal__btn--primary"
              onClick={() => onConfirm(Array.from(selected))}
              disabled={busy || selected.size === 0}
            >
              {busy ? strings.paying : strings.pay}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
