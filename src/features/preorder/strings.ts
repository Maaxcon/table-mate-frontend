import { useTranslation } from "react-i18next"

export function usePreorderStrings() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith("uk") ? "uk-UA" : "en-US"

  return {
    locale,
    add: t("preorder.add"),
    view: t("preorder.view"),
    cooking: t("preorder.cooking"),
    ready: t("preorder.ready"),
    dishes: (n: number) => t("preorder.dishes", { count: n }),
    unknownTable: t("preorder.unknownTable"),
    fallbackRestaurant: t("preorder.fallbackRestaurant"),
    tableLabel: (number: string) => t("preorder.tableLabel", { number }),
    eyebrow: t("preorder.eyebrow"),
    loading: t("preorder.loading"),
    loadError: t("preorder.loadError"),
    empty: t("preorder.empty"),
    closeAria: t("preorder.closeAria"),
    subtotal: (count: number) => t("preorder.subtotal", { count }),
    tax: t("preorder.tax"),
    serviceCharge: t("preorder.serviceCharge"),
    total: t("preorder.total"),
    paidBadge: t("preorder.paidBadge"),
    cookingBadge: t("preorder.cookingBadge"),
    addMore: t("preorder.addMore"),
    itemRemove: (name: string) => t("preorder.itemRemove", { name }),
    itemRemoveError: t("preorder.itemRemoveError"),
    cancel: t("preorder.cancel"),
    cancelling: t("preorder.cancelling"),
    cancelError: t("preorder.cancelError"),
    locked: t("preorder.locked"),
    ownerOnly: t("preorder.ownerOnly"),
  }
}
