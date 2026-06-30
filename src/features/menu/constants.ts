// Centralized API endpoint paths for the menu feature.

export const MENU_API = {
  categories: "/api/menu/categories/",
  items: "/api/menu/items/",
  itemsSearch: "/api/menu/items/search/",
  item: (itemId: string) => `/api/menu/items/${itemId}/`,
  toggleLike: (itemId: string) => `/api/menu/items/${itemId}/toggle-like/`,
  restaurantPublic: (restaurantId: string) =>
    `/api/restaurants/restaurants-public/${restaurantId}/`,
} as const

export const CART_API = {
  guestInit: "/api/auth/guest-init/",
  verifyScan: "/api/restaurants/tables/verify-scan/",
  items: (sessionId: string) => `/api/orders/cart/sessions/${sessionId}/items/`,
  item: (sessionId: string, itemId: string) =>
    `/api/orders/cart/sessions/${sessionId}/items/${itemId}/`,
  checkout: (sessionId: string) => `/api/orders/cart/sessions/${sessionId}/checkout/`,
  guestName: (sessionId: string) => `/api/orders/cart/sessions/${sessionId}/guest-name/`,
  bill: (sessionId: string) => `/api/orders/cart/sessions/${sessionId}/bill/`,
  pay: (sessionId: string) => `/api/orders/cart/sessions/${sessionId}/pay/`,
} as const
