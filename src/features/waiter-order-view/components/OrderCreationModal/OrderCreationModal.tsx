import { useEffect, useMemo, useState } from "react"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import type { MenuCategory, MenuItem } from "@/types/api/types.gen"
import {
  createOrderWithItems,
  fetchCategories,
  fetchMenuItems,
  searchMenuItems,
  type CreateOrderItem,
} from "../../api/orderApi"
import "./OrderCreationModal.css"

interface OrderCreationModalProps {
  sessionId: string
  guestCount: number
  restaurantId: string
  onClose: () => void
  onSuccess: () => void
}

interface DraftItem {
  menu_item_id: string
  name: string
  unit_price: string
  guest_slot: number
  quantity: number
  comment: string
}

export function OrderCreationModal({
  sessionId,
  guestCount,
  restaurantId,
  onClose,
  onSuccess,
}: OrderCreationModalProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [draftItems, setDraftItems] = useState<DraftItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const dialogRef = useFocusTrap<HTMLDivElement>({
    onEscape: () => {
      if (!submitting) onClose()
    },
  })

  useEffect(() => {
    fetchCategories(restaurantId)
      .then(setCategories)
      .catch(() => {})
  }, [restaurantId])

  useEffect(() => {
    if (searchQuery.trim()) {
      searchMenuItems(searchQuery, restaurantId)
        .then(setMenuItems)
        .catch(() => setMenuItems([]))
        .finally(() => setLoadingItems(false))
    } else {
      fetchMenuItems({ categoryId: selectedCategoryId ?? undefined, restaurantId })
        .then(setMenuItems)
        .catch(() => setMenuItems([]))
        .finally(() => setLoadingItems(false))
    }
  }, [selectedCategoryId, searchQuery, restaurantId])

  const filteredMenuItems = useMemo(() => {
    if (searchQuery.trim()) return menuItems
    return selectedCategoryId
      ? menuItems.filter((item) => item.category === selectedCategoryId)
      : menuItems
  }, [menuItems, selectedCategoryId, searchQuery])

  const addItem = (item: MenuItem) => {
    setDraftItems((prev) => {
      const existing = prev.find((d) => d.menu_item_id === item.public_id)
      if (existing) {
        return prev.map((d) =>
          d.menu_item_id === item.public_id ? { ...d, quantity: d.quantity + 1 } : d,
        )
      }
      return [
        ...prev,
        {
          menu_item_id: item.public_id,
          name: item.name,
          unit_price: item.price,
          guest_slot: 1,
          quantity: 1,
          comment: "",
        },
      ]
    })
  }

  const updateDraft = (menuItemId: string, patch: Partial<DraftItem>) => {
    setDraftItems((prev) =>
      prev.map((d) => (d.menu_item_id === menuItemId ? { ...d, ...patch } : d)),
    )
  }

  const removeDraft = (menuItemId: string) => {
    setDraftItems((prev) => prev.filter((d) => d.menu_item_id !== menuItemId))
  }

  const total = draftItems.reduce((sum, d) => sum + Number.parseFloat(d.unit_price) * d.quantity, 0)

  const handleSubmit = async () => {
    if (draftItems.length === 0) return
    setSubmitting(true)
    try {
      const items: CreateOrderItem[] = draftItems.map((d) => ({
        menu_item: d.menu_item_id,
        guest_slot: d.guest_slot,
        quantity: d.quantity,
        comment: d.comment || null,
      }))
      await createOrderWithItems(sessionId, items)
      onSuccess()
    } catch {
      // error handled by caller via onClose/onSuccess
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="ocm-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <div
        className="ocm"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocm-title"
      >
        <div className="ocm__header">
          <h2 id="ocm-title" className="ocm__title">
            NEW ORDER
          </h2>
          <button type="button" className="ocm__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="ocm__body">
          <div className="ocm__sidebar">
            <div className="ocm__search">
              <input
                type="text"
                className="ocm__search-input"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="ocm__categories">
              <button
                type="button"
                className={`ocm__category ${selectedCategoryId === null ? "ocm__category--active" : ""}`}
                onClick={() => setSelectedCategoryId(null)}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.public_id}
                  type="button"
                  className={`ocm__category ${selectedCategoryId === cat.public_id ? "ocm__category--active" : ""}`}
                  onClick={() => setSelectedCategoryId(cat.public_id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="ocm__grid">
            {loadingItems ? (
              <p className="ocm__loading">Loading...</p>
            ) : filteredMenuItems.length === 0 ? (
              <p className="ocm__empty">No items found.</p>
            ) : (
              filteredMenuItems.map((item) => (
                <button
                  key={item.public_id}
                  type="button"
                  className="ocm__item-card"
                  onClick={() => addItem(item)}
                >
                  <div className="ocm__item-image" />
                  <div className="ocm__item-info">
                    <span className="ocm__item-name">{item.name}</span>
                    <span className="ocm__item-price">&euro;{item.price}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="ocm__summary">
            <h3 className="ocm__summary-title">ORDER SUMMARY</h3>
            {draftItems.length === 0 ? (
              <p className="ocm__empty">No items added yet.</p>
            ) : (
              <div className="ocm__summary-items">
                {draftItems.map((d) => (
                  <div key={d.menu_item_id} className="ocm__summary-item">
                    <div className="ocm__summary-item-top">
                      <span className="ocm__summary-item-name">{d.name}</span>
                      <button
                        type="button"
                        className="ocm__summary-remove"
                        onClick={() => removeDraft(d.menu_item_id)}
                        aria-label="Remove"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="ocm__summary-item-controls">
                      <div className="ocm__summary-qty">
                        <button
                          type="button"
                          className="ocm__qty-btn"
                          onClick={() =>
                            updateDraft(d.menu_item_id, { quantity: Math.max(1, d.quantity - 1) })
                          }
                        >
                          -
                        </button>
                        <span className="ocm__qty-value">{d.quantity}</span>
                        <button
                          type="button"
                          className="ocm__qty-btn"
                          onClick={() => updateDraft(d.menu_item_id, { quantity: d.quantity + 1 })}
                        >
                          +
                        </button>
                      </div>
                      <select
                        className="ocm__guest-slot"
                        value={d.guest_slot}
                        onChange={(e) =>
                          updateDraft(d.menu_item_id, { guest_slot: Number(e.target.value) })
                        }
                      >
                        {Array.from({ length: guestCount }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Guest {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      className="ocm__comment-input"
                      placeholder="Comment..."
                      value={d.comment}
                      onChange={(e) => updateDraft(d.menu_item_id, { comment: e.target.value })}
                    />
                    <span className="ocm__summary-item-price">
                      &euro;{(Number.parseFloat(d.unit_price) * d.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="ocm__summary-total">
              <span>TOTAL</span>
              <span>&euro;{total.toFixed(2)}</span>
            </div>
            <button
              type="button"
              className="ocm__submit"
              disabled={draftItems.length === 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "SENDING..." : "SEND TO KITCHEN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
