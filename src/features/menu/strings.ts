import { useTranslation } from "react-i18next"
import type { WeekDay } from "@/types/workingHours"

export type GuestInfo = { name: string; slot: number }

const DAYS: WeekDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

export function useMenuStrings() {
  const { t } = useTranslation()

  const dayShort = {} as Record<WeekDay, string>
  for (const d of DAYS) {
    dayShort[d] = t(`menu.dayShort.${d}`)
  }

  return {
    header: {
      signIn: t("menu.header.signIn"),
      signOut: t("menu.header.signOut"),
      openCabinet: t("menu.header.openCabinet"),
      book: t("menu.header.book"),
      adminArea: t("menu.header.adminArea"),
      waiterArea: t("menu.header.waiterArea"),
    },
    hero: {
      label: t("menu.hero.label"),
      tagline: t("menu.hero.tagline"),
      openNow: t("menu.hero.openNow"),
      closedNow: t("menu.hero.closedNow"),
    },
    controls: {
      ingredientPlaceholder: t("menu.controls.ingredientPlaceholder"),
      sortAria: t("menu.controls.sortAria"),
      allergensAria: t("menu.controls.allergensAria"),
      excludeAllergens: (count: number) =>
        count
          ? t("menu.controls.excludeAllergens", { count })
          : t("menu.controls.excludeAllergens"),
      excludeAllergensTitle: t("menu.controls.excludeAllergensTitle"),
      excludeAllergensDescription: t("menu.controls.excludeAllergensDescription"),
      sortRecommended: t("menu.controls.sortRecommended"),
      sortPopular: t("menu.controls.sortPopular"),
      sortPriceAsc: t("menu.controls.sortPriceAsc"),
      sortPriceDesc: t("menu.controls.sortPriceDesc"),
      cartAria: t("menu.controls.cartAria"),
    },
    grid: {
      loadMore: t("menu.grid.loadMore"),
      loadingMore: t("menu.grid.loadingMore"),
      noDishesFound: t("menu.grid.noDishesFound"),
    },
    cartBar: {
      openAria: t("menu.cartBar.openAria"),
      action: t("menu.cartBar.action"),
      dismiss: t("menu.cartBar.dismiss"),
      items: (n: number) => t("menu.cartBar.items", { count: n }),
    },
    footer: {
      brand: t("menu.footer.brand"),
      tagline: t("menu.footer.tagline"),
      rights: (year: number, name: string | null) =>
        name ? t("menu.footer.rights", { year, name }) : t("menu.footer.rightsDefault", { year }),
    },
    card: {
      decrease: t("menu.card.decrease"),
      increase: t("menu.card.increase"),
      addToCart: (name: string) => t("menu.card.addToCart", { name }),
      unavailable: t("menu.card.unavailable"),
      like: (name: string) => t("menu.card.like", { name }),
      unlike: (name: string) => t("menu.card.unlike", { name }),
      likes: (count: number) => t("menu.card.likes", { count }),
    },
    cart: {
      title: t("menu.cart.title"),
      close: t("menu.cart.close"),
      confirmTitle: t("menu.cart.confirmTitle"),
      positions: (n: number) => t("menu.cart.positions", { count: n }),
      confirmYes: t("menu.cart.confirmYes"),
      confirmNo: t("menu.cart.confirmNo"),
      confirmedTitle: t("menu.cart.confirmedTitle"),
      confirmedSub: t("menu.cart.confirmedSub"),
      submitting: t("menu.cart.submitting"),
      checkoutError: t("menu.cart.checkoutError"),
      changedTitle: t("menu.cart.changedTitle"),
      changedSub: t("menu.cart.changedSub"),
      confirmRemaining: t("menu.cart.confirmRemaining"),
      backToCart: t("menu.cart.backToCart"),
      receiptLabel: t("menu.cart.receiptLabel"),
      subtotal: t("menu.cart.subtotal"),
      tax: t("menu.cart.tax"),
      serviceCharge: t("menu.cart.serviceCharge"),
      total: t("menu.cart.total"),
      emptyTitle: t("menu.cart.emptyTitle"),
      emptySub: t("menu.cart.emptySub"),
      perUnit: t("menu.cart.perUnit"),
      decrease: t("menu.cart.decrease"),
      increase: t("menu.cart.increase"),
      checkout: t("menu.cart.checkout"),
      pay: t("menu.cart.pay"),
      billTitle: t("menu.cart.billTitle"),
      billToPay: t("menu.cart.billToPay"),
      billSelectAll: t("menu.cart.billSelectAll"),
      billPaidLabel: t("menu.cart.billPaidLabel"),
      billAllPaid: t("menu.cart.billAllPaid"),
      billNoneToPay: t("menu.cart.billNoneToPay"),
      billLoading: t("menu.cart.billLoading"),
      billPaidOf: (paid: string, total: string) => t("menu.cart.billPaidOf", { paid, total }),
      billSelected: t("menu.cart.billSelected"),
      billProgressLabel: t("menu.cart.billProgressLabel"),
      paying: t("menu.cart.paying"),
      payError: t("menu.cart.payError"),
      groupedBy: t("menu.cart.groupedBy"),
      you: t("menu.cart.you"),
      errorAdd: t("menu.cart.errorAdd"),
      errorUpdate: t("menu.cart.errorUpdate"),
      errorRemove: t("menu.cart.errorRemove"),
      errorFetch: t("menu.cart.errorFetch"),
      requiresActiveTable: t("menu.cart.requiresActiveTable"),
      initializing: t("menu.cart.initializing"),
      sessionUnavailable: t("menu.cart.sessionUnavailable"),
      noActiveReservation: t("menu.cart.noActiveReservation"),
      reservationNotYetActive: (time: string | null) =>
        time
          ? t("menu.cart.reservationNotYetActive", { time })
          : t("menu.cart.reservationNotYetActiveDefault"),
      unavailable: (name: string) => t("menu.cart.unavailable", { name }),
      retry: t("menu.cart.retry"),
      connecting: t("menu.cart.connecting"),
      connected: t("menu.cart.connected"),
      disconnected: t("menu.cart.disconnected"),
      sessionExpired: t("menu.cart.sessionExpired"),
      lobbyTitle: t("menu.cart.lobbyTitle"),
      lobbySubtitle: t("menu.cart.lobbySubtitle"),
      lobbyPlaceholder: t("menu.cart.lobbyPlaceholder"),
      lobbyJoin: t("menu.cart.lobbyJoin"),
      lobbySkipped: t("menu.cart.lobbySkipped"),
      guestPrefix: t("menu.cart.guestPrefix"),
      slotLabel: (slot: number) => t("menu.cart.slotLabel", { slot }),
      unknownItem: t("menu.cart.unknownItem"),
    },
    item: {
      ingredients: t("menu.item.ingredients"),
      allergens: t("menu.item.allergens"),
      added: t("menu.item.added"),
      addToCart: t("menu.item.addToCart"),
      unavailable: t("menu.item.unavailable"),
      close: t("menu.item.close"),
      commentLabel: t("menu.item.commentLabel"),
      commentPlaceholder: t("menu.item.commentPlaceholder"),
    },
    info: {
      heading: t("menu.info.heading"),
      hours: t("menu.info.hours"),
      openNow: t("menu.info.openNow"),
      closedNow: t("menu.info.closedNow"),
      contacts: t("menu.info.contacts"),
      social: t("menu.info.social"),
      call: t("menu.info.call"),
      viewOnMap: t("menu.info.viewOnMap"),
      currency: (code: string) => t("menu.info.currency", { code }),
    },
    weightGrams: (grams: number) => t("menu.weightGrams", { grams }),
    dayShort,
  }
}
