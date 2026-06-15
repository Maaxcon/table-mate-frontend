import { useCallback, useEffect, useMemo, useReducer, useRef } from "react"
import { addCartItem, deleteCartItem, fetchCartItems, updateCartItem } from "@/features/menu/api"
import type { CartItemResponse, MenuItem } from "@/features/menu/types"
import { menuStrings } from "@/features/menu/strings"

export type CartItemWithDetails = {
  id: string
  menuItemId: string
  quantity: number
  comment: string | null
  guestSlot: number | null
  deviceId: string | null
  addedBy: string | null
  isPaid: boolean
  item: MenuItem | null
}

type State = {
  items: CartItemResponse[]
  snapshot: CartItemResponse[] | null
  loading: boolean
  error: string | null
  errorItemId: string | null
}

type Action =
  | { type: "SET_ITEMS"; items: CartItemResponse[] }
  | { type: "OPTIMISTIC_ADD"; item: CartItemResponse }
  | { type: "OPTIMISTIC_UPDATE"; itemId: string; changes: Partial<CartItemResponse> }
  | { type: "OPTIMISTIC_REMOVE"; itemId: string }
  | { type: "SAVE_SNAPSHOT" }
  | { type: "ROLLBACK" }
  | { type: "SET_LOADING"; loading: boolean }
  | {
      type: "SET_ERROR"
      error: string | null
      itemId?: string | null
    }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ITEMS":
      return { ...state, items: action.items, loading: false, error: null, errorItemId: null }
    case "OPTIMISTIC_ADD": {
      const exists = state.items.find((i) => i.menu_item === action.item.menu_item)
      if (exists) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.menu_item === action.item.menu_item
              ? { ...i, quantity: i.quantity + action.item.quantity }
              : i,
          ),
        }
      }
      return { ...state, items: [...state.items, action.item] }
    }
    case "OPTIMISTIC_UPDATE":
      return {
        ...state,
        items: state.items.map((i) =>
          i.public_id === action.itemId ? { ...i, ...action.changes } : i,
        ),
      }
    case "OPTIMISTIC_REMOVE":
      return {
        ...state,
        items: state.items.filter((i) => i.public_id !== action.itemId),
      }
    case "SAVE_SNAPSHOT":
      return { ...state, snapshot: state.items }
    case "ROLLBACK":
      return {
        ...state,
        items: state.snapshot ?? state.items,
        snapshot: null,
        error: null,
      }
    case "SET_LOADING":
      return { ...state, loading: action.loading }
    case "SET_ERROR":
      return {
        ...state,
        error: action.error,
        errorItemId: action.itemId ?? null,
      }
  }
}

type UseCartOptions = {
  cartSessionId: string | null
  guestJwt: string | null
  itemsById: Record<string, MenuItem>
  reserved?: boolean
}

type UseCartResult = {
  items: CartItemWithDetails[]
  totalCount: number
  totalPrice: number
  loading: boolean
  error: string | null
  errorItemId: string | null
  addItem: (menuItemId: string) => Promise<void>
  setQuantity: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  syncFromServer: () => Promise<void>
  clearError: () => void
}

const initialState: State = {
  items: [],
  snapshot: null,
  loading: false,
  error: null,
  errorItemId: null,
}

const MENU_ITEM_UNAVAILABLE = "menu_item_unavailable"

function isUnavailableError(err: unknown): boolean {
  return err instanceof Error && (err as { code?: string }).code === MENU_ITEM_UNAVAILABLE
}

function getUnavailableMessage(
  menuItemId: string | undefined,
  itemsById: Record<string, MenuItem>,
): string {
  if (!menuItemId) {
    return menuStrings.cart.unavailable(menuStrings.cart.unknownItem)
  }
  const name = itemsById[menuItemId]?.name ?? menuStrings.cart.unknownItem
  return menuStrings.cart.unavailable(name)
}

function resolveCartError(
  err: unknown,
  fallback: string,
  info: { menuItemId?: string; itemsById: Record<string, MenuItem> },
): string {
  if (isUnavailableError(err)) {
    return getUnavailableMessage(info.menuItemId, info.itemsById)
  }
  return err instanceof Error ? err.message : fallback
}

function buildDetails(
  items: CartItemResponse[],
  itemsById: Record<string, MenuItem>,
): CartItemWithDetails[] {
  return items.map((ci) => ({
    id: ci.public_id,
    menuItemId: ci.menu_item,
    quantity: ci.quantity,
    comment: ci.comment,
    guestSlot: ci.guest_slot,
    deviceId: ci.device_id,
    addedBy: ci.added_by,
    isPaid: ci.is_paid,
    item: itemsById[ci.menu_item] ?? null,
  }))
}

export function useCart({
  cartSessionId,
  guestJwt,
  itemsById,
  reserved,
}: UseCartOptions): UseCartResult {
  const [state, dispatch] = useReducer(reducer, initialState)
  const initialFetchDone = useRef(false)

  const mutationChain = useRef<Promise<void>>(Promise.resolve())
  const runExclusive = useCallback((task: () => Promise<void>): Promise<void> => {
    const next = mutationChain.current.then(task, task)
    mutationChain.current = next.catch(() => {})
    return next
  }, [])

  const itemsRef = useRef(state.items)
  useEffect(() => {
    itemsRef.current = state.items
  }, [state.items])

  const findMenuItemIdByCartItem = useCallback(
    (cartItemId: string): string | undefined =>
      itemsRef.current.find((ci) => ci.public_id === cartItemId)?.menu_item,
    [],
  )

  useEffect(() => {
    initialFetchDone.current = false
  }, [cartSessionId, guestJwt])

  const refetch = useCallback(async () => {
    if (!cartSessionId || !guestJwt) return
    dispatch({ type: "SET_LOADING", loading: true })
    try {
      const items = await fetchCartItems(cartSessionId, guestJwt)
      dispatch({ type: "SET_ITEMS", items })
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : menuStrings.cart.errorFetch,
      })
    } finally {
      dispatch({ type: "SET_LOADING", loading: false })
    }
  }, [cartSessionId, guestJwt])

  const syncFromServer = useCallback(() => runExclusive(refetch), [runExclusive, refetch])

  useEffect(() => {
    if (!cartSessionId || !guestJwt || !reserved) return
    if (initialFetchDone.current) return
    initialFetchDone.current = true
    refetch()
  }, [cartSessionId, guestJwt, refetch, reserved])

  const addItem = useCallback(
    (menuItemId: string): Promise<void> =>
      runExclusive(async () => {
        if (!cartSessionId || !guestJwt) return
        dispatch({ type: "SAVE_SNAPSHOT" })
        const tempItem: CartItemResponse = {
          public_id: `temp-${Date.now()}`,
          menu_item: menuItemId,
          quantity: 1,
          comment: null,
          added_by: null,
          guest_slot: null,
          device_id: null,
          is_paid: false,
          cart_session: cartSessionId,
          restaurant: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        dispatch({ type: "OPTIMISTIC_ADD", item: tempItem })

        try {
          await addCartItem(cartSessionId, { menu_item: menuItemId, quantity: 1 }, guestJwt)
          await refetch()
        } catch (err) {
          dispatch({ type: "ROLLBACK" })
          dispatch({
            type: "SET_ERROR",
            error: resolveCartError(err, menuStrings.cart.errorAdd, {
              menuItemId,
              itemsById,
            }),
            itemId: tempItem.public_id,
          })
        }
      }),
    [cartSessionId, guestJwt, refetch, itemsById, runExclusive],
  )

  const setQuantity = useCallback(
    (itemId: string, quantity: number): Promise<void> =>
      runExclusive(async () => {
        if (!cartSessionId || !guestJwt) return
        dispatch({ type: "SAVE_SNAPSHOT" })
        const menuItemIdForError = findMenuItemIdByCartItem(itemId)

        if (quantity <= 0) {
          dispatch({ type: "OPTIMISTIC_REMOVE", itemId })
          try {
            await deleteCartItem(cartSessionId, itemId, guestJwt)
            await refetch()
          } catch (err) {
            dispatch({ type: "ROLLBACK" })
            dispatch({
              type: "SET_ERROR",
              error: resolveCartError(err, menuStrings.cart.errorRemove, {
                menuItemId: menuItemIdForError,
                itemsById,
              }),
              itemId,
            })
          }
          return
        }

        dispatch({
          type: "OPTIMISTIC_UPDATE",
          itemId,
          changes: { quantity },
        })

        try {
          await updateCartItem(cartSessionId, itemId, { quantity }, guestJwt)
          await refetch()
        } catch (err) {
          dispatch({ type: "ROLLBACK" })
          dispatch({
            type: "SET_ERROR",
            error: resolveCartError(err, menuStrings.cart.errorUpdate, {
              menuItemId: menuItemIdForError,
              itemsById,
            }),
            itemId,
          })
        }
      }),
    [cartSessionId, guestJwt, refetch, itemsById, findMenuItemIdByCartItem, runExclusive],
  )

  const removeItem = useCallback(
    (itemId: string): Promise<void> =>
      runExclusive(async () => {
        if (!cartSessionId || !guestJwt) return
        dispatch({ type: "SAVE_SNAPSHOT" })
        dispatch({ type: "OPTIMISTIC_REMOVE", itemId })
        const menuItemIdForError = findMenuItemIdByCartItem(itemId)

        try {
          await deleteCartItem(cartSessionId, itemId, guestJwt)
          await refetch()
        } catch (err) {
          dispatch({ type: "ROLLBACK" })
          dispatch({
            type: "SET_ERROR",
            error: resolveCartError(err, menuStrings.cart.errorRemove, {
              menuItemId: menuItemIdForError,
              itemsById,
            }),
            itemId,
          })
        }
      }),
    [cartSessionId, guestJwt, refetch, itemsById, findMenuItemIdByCartItem, runExclusive],
  )

  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", error: null })
  }, [])

  const items = useMemo(() => buildDetails(state.items, itemsById), [state.items, itemsById])

  const totalCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])

  const totalPrice = useMemo(
    () =>
      items.reduce((s, i) => {
        if (!i.item) return s
        const p = parseFloat(i.item.price)
        return s + (isNaN(p) ? 0 : p) * i.quantity
      }, 0),
    [items],
  )

  return {
    items,
    totalCount,
    totalPrice,
    loading: state.loading,
    error: state.error,
    errorItemId: state.errorItemId,
    addItem,
    setQuantity,
    removeItem,
    syncFromServer,
    clearError,
  }
}
