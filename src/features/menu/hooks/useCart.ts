import { useCallback, useEffect, useReducer } from "react"
import type { MenuItem } from "@/types/menu"

export type CartItem = { item: MenuItem; quantity: number }

type State = { items: CartItem[] }

type Action =
  | { type: "ADD"; item: MenuItem }
  | { type: "REMOVE"; publicId: string }
  | { type: "SET_QTY"; publicId: string; quantity: number }
  | { type: "CLEAR" }

function storageKey(restaurantId: string): string {
  return `tablemate.cart.${restaurantId}.v1`
}

function loadFromStorage(restaurantId: string): State {
  try {
    const raw = localStorage.getItem(storageKey(restaurantId))
    if (!raw) return { items: [] }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { items: [] }
    return { items: parsed }
  } catch {
    return { items: [] }
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD": {
      const existing = state.items.find((i) => i.item.public_id === action.item.public_id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.item.public_id === action.item.public_id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        }
      }
      return { items: [...state.items, { item: action.item, quantity: 1 }] }
    }
    case "REMOVE":
      return { items: state.items.filter((i) => i.item.public_id !== action.publicId) }
    case "SET_QTY": {
      if (action.quantity <= 0) {
        return { items: state.items.filter((i) => i.item.public_id !== action.publicId) }
      }
      return {
        items: state.items.map((i) =>
          i.item.public_id === action.publicId ? { ...i, quantity: action.quantity } : i,
        ),
      }
    }
    case "CLEAR":
      return { items: [] }
  }
}

export type UseCartResult = {
  items: CartItem[]
  totalCount: number
  totalPrice: number
  addItem: (item: MenuItem) => void
  removeItem: (publicId: string) => void
  setQuantity: (publicId: string, quantity: number) => void
  clear: () => void
}

function useCart(restaurantId: string): UseCartResult {
  const [state, dispatch] = useReducer(reducer, restaurantId, loadFromStorage)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(restaurantId), JSON.stringify(state.items))
    } catch {
      // localStorage unavailable (private mode, quota exceeded) — ignore
    }
  }, [restaurantId, state.items])

  const addItem = useCallback((item: MenuItem) => dispatch({ type: "ADD", item }), [])
  const removeItem = useCallback((publicId: string) => dispatch({ type: "REMOVE", publicId }), [])
  const setQuantity = useCallback(
    (publicId: string, quantity: number) => dispatch({ type: "SET_QTY", publicId, quantity }),
    [],
  )
  const clear = useCallback(() => dispatch({ type: "CLEAR" }), [])

  const totalCount = state.items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = state.items.reduce((sum, i) => {
    const p = parseFloat(i.item.price)
    return sum + (isNaN(p) ? 0 : p) * i.quantity
  }, 0)

  return { items: state.items, totalCount, totalPrice, addItem, removeItem, setQuantity, clear }
}

export { useCart }
