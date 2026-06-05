import { useCallback, useEffect, useMemo, useReducer } from "react"
import { fetchItem } from "../api"
import type { MenuItem } from "../types"

export type CartItem = { item: MenuItem; quantity: number }
type CartLine = { publicId: string; quantity: number }

type State = {
  restaurantId: string
  lines: CartLine[]
  itemsById: Record<string, MenuItem>
}

type Action =
  | { type: "ADD"; item: MenuItem }
  | { type: "SET_QTY"; publicId: string; quantity: number }
  | { type: "CLEAR" }
  | { type: "LOAD_RESTAURANT"; restaurantId: string; lines: CartLine[] }
  | { type: "HYDRATE_ITEMS"; requestedIds: string[]; items: MenuItem[] }

function storageKey(restaurantId: string): string {
  return `tablemate.cart.${restaurantId}.v2`
}

function legacyStorageKey(restaurantId: string): string {
  return `tablemate.cart.${restaurantId}.v1`
}

function isValidCartLine(v: unknown): v is CartLine {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as CartLine).publicId === "string" &&
    typeof (v as CartLine).quantity === "number" &&
    Number.isFinite((v as CartLine).quantity) &&
    (v as CartLine).quantity > 0
  )
}

function isLegacyCartItem(v: unknown): v is CartItem {
  return (
    typeof v === "object" &&
    v !== null &&
    "item" in v &&
    typeof (v as CartItem).item?.public_id === "string" &&
    typeof (v as CartItem).quantity === "number" &&
    Number.isFinite((v as CartItem).quantity) &&
    (v as CartItem).quantity > 0
  )
}

function loadLinesFromStorage(restaurantId: string): CartLine[] {
  try {
    const raw = localStorage.getItem(storageKey(restaurantId))
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter(isValidCartLine)
    }

    const legacyRaw = localStorage.getItem(legacyStorageKey(restaurantId))
    if (!legacyRaw) return []

    const legacyParsed: unknown = JSON.parse(legacyRaw)
    if (!Array.isArray(legacyParsed)) return []

    return legacyParsed.filter(isLegacyCartItem).map(({ item, quantity }) => ({
      publicId: item.public_id,
      quantity,
    }))
  } catch {
    return []
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD": {
      const existing = state.lines.find((line) => line.publicId === action.item.public_id)
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((line) =>
            line.publicId === action.item.public_id
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          ),
          itemsById: { ...state.itemsById, [action.item.public_id]: action.item },
        }
      }
      return {
        ...state,
        lines: [...state.lines, { publicId: action.item.public_id, quantity: 1 }],
        itemsById: { ...state.itemsById, [action.item.public_id]: action.item },
      }
    }
    case "SET_QTY": {
      if (action.quantity <= 0) {
        const itemsById = { ...state.itemsById }
        delete itemsById[action.publicId]
        return {
          ...state,
          lines: state.lines.filter((line) => line.publicId !== action.publicId),
          itemsById,
        }
      }
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.publicId === action.publicId ? { ...line, quantity: action.quantity } : line,
        ),
      }
    }
    case "CLEAR":
      return { ...state, lines: [], itemsById: {} }
    case "LOAD_RESTAURANT":
      return { restaurantId: action.restaurantId, lines: action.lines, itemsById: {} }
    case "HYDRATE_ITEMS": {
      const requestedIds = new Set(action.requestedIds)
      const validIds = new Set(action.items.map((item) => item.public_id))
      const itemsById = { ...state.itemsById }

      for (const publicId of requestedIds) {
        delete itemsById[publicId]
      }
      for (const item of action.items) {
        itemsById[item.public_id] = item
      }

      return {
        ...state,
        lines: state.lines.filter(
          (line) => !requestedIds.has(line.publicId) || validIds.has(line.publicId),
        ),
        itemsById,
      }
    }
  }
}

export type UseCartResult = {
  items: CartItem[]
  totalCount: number
  totalPrice: number
  addItem: (item: MenuItem) => void
  setQuantity: (publicId: string, quantity: number) => void
  clear: () => void
}

function initState(restaurantId: string): State {
  return { restaurantId, lines: loadLinesFromStorage(restaurantId), itemsById: {} }
}

function useCart(restaurantId: string, guestToken?: string): UseCartResult {
  const [state, dispatch] = useReducer(reducer, restaurantId, initState)

  useEffect(() => {
    dispatch({
      type: "LOAD_RESTAURANT",
      restaurantId,
      lines: loadLinesFromStorage(restaurantId),
    })
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId || state.restaurantId !== restaurantId) return
    try {
      localStorage.setItem(storageKey(restaurantId), JSON.stringify(state.lines))
      localStorage.removeItem(legacyStorageKey(restaurantId))
    } catch {
      // localStorage unavailable (private mode, quota exceeded) — ignore
    }
  }, [restaurantId, state.restaurantId, state.lines])

  useEffect(() => {
    if (!restaurantId || state.restaurantId !== restaurantId || state.lines.length === 0) return

    const missingLines = state.lines.filter((line) => !state.itemsById[line.publicId])
    if (missingLines.length === 0) return

    const controller = new AbortController()
    const requestedIds = missingLines.map((line) => line.publicId)

    Promise.all(
      requestedIds.map((publicId) =>
        fetchItem(restaurantId, publicId, guestToken, controller.signal),
      ),
    )
      .then((items) => {
        const availableItems = items.filter(
          (item): item is MenuItem => item !== null && item.is_available === true,
        )
        dispatch({ type: "HYDRATE_ITEMS", requestedIds, items: availableItems })
      })
      .catch(() => {
        if (controller.signal.aborted) return
      })

    return () => controller.abort()
  }, [guestToken, restaurantId, state.itemsById, state.lines, state.restaurantId])

  const addItem = useCallback((item: MenuItem) => dispatch({ type: "ADD", item }), [])
  const setQuantity = useCallback(
    (publicId: string, quantity: number) => dispatch({ type: "SET_QTY", publicId, quantity }),
    [],
  )
  const clear = useCallback(() => dispatch({ type: "CLEAR" }), [])

  const items = useMemo(
    () =>
      state.lines.flatMap((line) => {
        const item = state.itemsById[line.publicId]
        return item ? [{ item, quantity: line.quantity }] : []
      }),
    [state.itemsById, state.lines],
  )

  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])
  const totalPrice = useMemo(
    () =>
      items.reduce((sum, i) => {
        const p = parseFloat(i.item.price)
        return sum + (isNaN(p) ? 0 : p) * i.quantity
      }, 0),
    [items],
  )

  return { items, totalCount, totalPrice, addItem, setQuantity, clear }
}

export { useCart }
