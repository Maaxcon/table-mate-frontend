import { useCallback, useReducer } from "react"
import type { MenuItem } from "@/types/menu"

export type CartItem = { item: MenuItem; quantity: number }

type State = { items: CartItem[] }

type Action =
  | { type: "ADD"; item: MenuItem }
  | { type: "REMOVE"; publicId: string }
  | { type: "SET_QTY"; publicId: string; quantity: number }
  | { type: "CLEAR" }

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

function useCart(): UseCartResult {
  const [state, dispatch] = useReducer(reducer, { items: [] })

  const addItem = useCallback((item: MenuItem) => dispatch({ type: "ADD", item }), [])
  const removeItem = useCallback((publicId: string) => dispatch({ type: "REMOVE", publicId }), [])
  const setQuantity = useCallback(
    (publicId: string, quantity: number) => dispatch({ type: "SET_QTY", publicId, quantity }),
    [],
  )
  const clear = useCallback(() => dispatch({ type: "CLEAR" }), [])

  const totalCount = state.items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = state.items.reduce((sum, i) => sum + parseFloat(i.item.price) * i.quantity, 0)

  return { items: state.items, totalCount, totalPrice, addItem, removeItem, setQuantity, clear }
}

export { useCart }
