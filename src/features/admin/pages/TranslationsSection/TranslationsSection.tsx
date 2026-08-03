import { useEffect, useState, useRef, useCallback } from "react"
import "@/features/admin/components/styles/translations.css"
import { api } from "@/api/client"
import { useAdminStrings } from "@/features/admin/strings"
import TranslationEditModal from "@/features/admin/components/TranslationEditModal"
import LayoutTab from "./LayoutTab"
import * as menuApi from "@/features/admin/api/menu"
import { LANGUAGE_NAMES } from "@/features/admin/constants/settingsOptions"
import type {
  AdminAllergen,
  AdminCategoryWithTranslations,
  AdminIngredient,
  AdminMenuItemWithTranslations,
  AdminMenuWithTranslations,
  AdminRestaurantWithTranslations,
  AdminZoneWithTranslations,
  AllergenTranslation,
  IngredientTranslation,
  MenuCategoryTranslation,
  MenuItemTranslation,
  MenuTranslation,
  RestaurantTranslation,
  ZoneTranslation,
} from "@/features/admin/types"

type EntityType = "menu" | "category" | "item" | "allergen" | "ingredient" | "restaurant" | "zone"

type Translation =
  | MenuTranslation
  | MenuCategoryTranslation
  | MenuItemTranslation
  | AllergenTranslation
  | IngredientTranslation
  | RestaurantTranslation
  | ZoneTranslation

type TabKey =
  | "menu"
  | "category"
  | "item"
  | "allergen"
  | "ingredient"
  | "restaurant"
  | "zone"
  | "layout"

type TranslationModalState = {
  entityType: EntityType
  entity:
    | AdminMenuWithTranslations
    | AdminCategoryWithTranslations
    | AdminMenuItemWithTranslations
    | AdminAllergen
    | AdminIngredient
    | AdminRestaurantWithTranslations
    | AdminZoneWithTranslations
  languageCode: string
  languageName: string
  existingTranslation: Translation | null
}

function getTranslations(entity: { translations?: Translation[] }): Translation[] {
  return entity.translations ?? []
}

function getEntityName(
  entity:
    | AdminMenuWithTranslations
    | AdminCategoryWithTranslations
    | AdminMenuItemWithTranslations
    | AdminAllergen
    | AdminIngredient
    | AdminRestaurantWithTranslations
    | AdminZoneWithTranslations,
): string {
  if ("name" in entity) return entity.name ?? ""
  return ""
}

function getEntityId(entity: Record<string, unknown>): string {
  return (entity.public_id as string) ?? ""
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "menu", label: "menu" },
  { key: "category", label: "category" },
  { key: "item", label: "item" },
  { key: "allergen", label: "allergen" },
  { key: "ingredient", label: "ingredient" },
  { key: "restaurant", label: "restaurant" },
  { key: "zone", label: "zone" },
  { key: "layout", label: "layout" },
]

function TranslationsSection() {
  const strings = useAdminStrings()

  const tabLabels: Record<TabKey, string> = {
    menu: strings.translations.tabs.menu,
    category: strings.translations.tabs.category,
    item: strings.translations.tabs.item,
    allergen: strings.translations.tabs.allergen,
    ingredient: strings.translations.tabs.ingredient,
    restaurant: strings.translations.tabs.restaurant,
    zone: strings.translations.tabs.zone,
    layout: strings.translations.tabs.layout,
  }

  const [locale, setLocale] = useState<string>("en")
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([])
  const [menus, setMenus] = useState<AdminMenuWithTranslations[]>([])
  const [categories, setCategories] = useState<AdminCategoryWithTranslations[]>([])
  const [items, setItems] = useState<AdminMenuItemWithTranslations[]>([])
  const [allergens, setAllergens] = useState<AdminAllergen[]>([])
  const [ingredients, setIngredients] = useState<AdminIngredient[]>([])
  const [restaurants, setRestaurants] = useState<AdminRestaurantWithTranslations[]>([])
  const [zones, setZones] = useState<AdminZoneWithTranslations[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("menu")
  const [modal, setModal] = useState<TranslationModalState | null>(null)

  const loadedTabs = useRef<Set<TabKey>>(new Set())
  const tabAbortRef = useRef<AbortController | null>(null)

  function getEntityList(tab: TabKey): unknown[] {
    switch (tab) {
      case "menu":
        return menus
      case "category":
        return categories
      case "item":
        return items
      case "allergen":
        return allergens
      case "ingredient":
        return ingredients
      case "restaurant":
        return restaurants
      case "zone":
        return zones
      case "layout":
        return []
    }
  }

  function setEntityList(tab: TabKey, list: unknown[]): void {
    switch (tab) {
      case "menu":
        setMenus(list as AdminMenuWithTranslations[])
        break
      case "category":
        setCategories(list as AdminCategoryWithTranslations[])
        break
      case "item":
        setItems(list as AdminMenuItemWithTranslations[])
        break
      case "allergen":
        setAllergens(list as AdminAllergen[])
        break
      case "ingredient":
        setIngredients(list as AdminIngredient[])
        break
      case "restaurant":
        setRestaurants(list as AdminRestaurantWithTranslations[])
        break
      case "zone":
        setZones(list as AdminZoneWithTranslations[])
        break
      case "layout":
        break
    }
  }

  function optimisticallyUpdateTranslation(
    list: unknown[],
    publicId: string,
    languageCode: string,
    formData: Record<string, string>,
  ): unknown[] {
    return list.map((item) => {
      const entity = item as Record<string, unknown>
      if (entity.public_id !== publicId) return item
      const translations = (entity.translations as Record<string, unknown>[] | undefined) ?? []
      const filtered = translations.filter((t) => t.language_code !== languageCode)
      const newTranslation: Record<string, unknown> = { language_code: languageCode, ...formData }
      if (formData.description === "") {
        newTranslation.description = null
      }
      return { ...entity, translations: [...filtered, newTranslation] }
    })
  }

  function optimisticallyRemoveTranslation(
    list: unknown[],
    publicId: string,
    languageCode: string,
  ): unknown[] {
    return list.map((item) => {
      const entity = item as Record<string, unknown>
      if (entity.public_id !== publicId) return item
      const translations = (entity.translations as Record<string, unknown>[] | undefined) ?? []
      return {
        ...entity,
        translations: translations.filter((t) => t.language_code !== languageCode),
      }
    })
  }

  async function fetchEntityList(tab: TabKey): Promise<unknown[]> {
    switch (tab) {
      case "menu":
        return menuApi.fetchMenusWithTranslations()
      case "category":
        return menuApi.fetchCategoriesWithTranslations()
      case "item":
        return menuApi.fetchItemsWithTranslations()
      case "allergen":
        return menuApi.fetchAdminAllergens()
      case "ingredient":
        return menuApi.fetchAdminIngredients()
      case "restaurant":
        return menuApi.fetchRestaurantsWithTranslations()
      case "zone":
        return menuApi.fetchZonesWithTranslations()
      case "layout":
        return []
    }
  }

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setInitialLoading(true)
    setError(null)
    try {
      const [settingsList, menusData] = await Promise.all([
        api.getList<{ locale: string; supported_languages: string[] }>(
          "/api/restaurants/restaurant-settings/",
          { signal },
        ),
        menuApi.fetchMenusWithTranslations(signal),
      ])
      const settings = settingsList[0] ?? {}
      setLocale(settings.locale ?? "en")
      setSupportedLanguages(settings.supported_languages ?? [])
      setMenus(menusData)
      loadedTabs.current.add("menu")
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Failed to load data.")
    } finally {
      setInitialLoading(false)
    }
  }, [])

  const loadTabData = async (tab: TabKey) => {
    if (loadedTabs.current.has(tab)) return

    tabAbortRef.current?.abort()
    const controller = new AbortController()
    tabAbortRef.current = controller

    setTabLoading(true)
    setError(null)
    try {
      let data: unknown[] = []
      switch (tab) {
        case "menu":
          data = await menuApi.fetchMenusWithTranslations(controller.signal)
          break
        case "category":
          data = await menuApi.fetchCategoriesWithTranslations(controller.signal)
          break
        case "item":
          data = await menuApi.fetchItemsWithTranslations(controller.signal)
          break
        case "allergen":
          data = await menuApi.fetchAdminAllergens(controller.signal)
          break
        case "ingredient":
          data = await menuApi.fetchAdminIngredients(controller.signal)
          break
        case "restaurant":
          data = await menuApi.fetchRestaurantsWithTranslations(controller.signal)
          break
        case "zone":
          data = await menuApi.fetchZonesWithTranslations(controller.signal)
          break
        case "layout":
          break
      }
      loadedTabs.current.add(tab)
      setEntityList(tab, data)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Failed to load data.")
    } finally {
      setTabLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(controller.signal)
    return () => controller.abort()
  }, [loadData])

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    loadTabData(tab)
  }

  const handleBadgeClick = (
    entityType: EntityType,
    entity:
      | AdminMenuWithTranslations
      | AdminCategoryWithTranslations
      | AdminMenuItemWithTranslations
      | AdminAllergen
      | AdminIngredient
      | AdminRestaurantWithTranslations
      | AdminZoneWithTranslations,
    langCode: string,
  ) => {
    const translations = getTranslations(entity as { translations?: Translation[] })
    const existing = translations.find((t) => t.language_code === langCode) ?? null
    setModal({
      entityType,
      entity,
      languageCode: langCode,
      languageName: LANGUAGE_NAMES[langCode] ?? langCode,
      existingTranslation: existing,
    })
  }

  const getCurrentEntities = () => {
    switch (activeTab) {
      case "menu":
        return { list: menus, entityType: "menu" as EntityType }
      case "category":
        return { list: categories, entityType: "category" as EntityType }
      case "item":
        return { list: items, entityType: "item" as EntityType }
      case "allergen":
        return { list: allergens, entityType: "allergen" as EntityType }
      case "ingredient":
        return { list: ingredients, entityType: "ingredient" as EntityType }
      case "restaurant":
        return { list: restaurants, entityType: "restaurant" as EntityType }
      case "zone":
        return { list: zones, entityType: "zone" as EntityType }
      case "layout":
        return { list: [], entityType: "zone" as EntityType }
    }
  }

  const { list, entityType } = getCurrentEntities()

  if (initialLoading) {
    return (
      <section className="admin-section">
        <header className="admin-section__header">
          <h1 className="admin-section__title">{strings.translations.title}</h1>
          <p className="admin-section__description">{strings.common.loading}</p>
        </header>
      </section>
    )
  }

  if (error) {
    return (
      <section className="admin-section">
        <header className="admin-section__header">
          <h1 className="admin-section__title">{strings.translations.title}</h1>
          <p className="admin-form__status admin-form__status--error">{error}</p>
        </header>
      </section>
    )
  }

  const displayLanguages = supportedLanguages.filter((l) => l !== locale)

  return (
    <section className="admin-section admin-section--wide">
      <header className="admin-section__header">
        <h1 className="admin-section__title">{strings.translations.title}</h1>
        <p className="admin-section__description">
          {strings.translations.primaryLanguage} <strong>{LANGUAGE_NAMES[locale] ?? locale}</strong>
        </p>
      </header>

      <div className="translations__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`translations__tab${activeTab === tab.key ? " translations__tab--active" : ""}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tabLabels[tab.key]}
          </button>
        ))}
      </div>

      {displayLanguages.length === 0 && (
        <p className="admin-section__description">{strings.translations.noLanguages}</p>
      )}

      {activeTab === "layout" ? (
        <LayoutTab locale={locale} supportedLanguages={supportedLanguages} />
      ) : (
        displayLanguages.length > 0 && (
          <div className="translations__table-wrapper">
            <div className="translations__table">
              <div className="translations__table-header">
                <div className="translations__col-name">{strings.translations.name}</div>
                {displayLanguages.map((lang) => (
                  <div key={lang} className="translations__col-lang">
                    {LANGUAGE_NAMES[lang] ?? lang}
                  </div>
                ))}
              </div>

              {(list as Array<Record<string, unknown>>).length === 0 && (
                <p className="admin-section__description">
                  {strings.translations.empty(tabLabels[activeTab])}
                </p>
              )}

              {(list as Array<Record<string, unknown>>).map((entity: Record<string, unknown>) => {
                const translations = getTranslations(entity as { translations?: Translation[] })
                const primaryName = getEntityName(entity as AdminMenuWithTranslations)

                return (
                  <div
                    key={`${entityType}-${getEntityId(entity)}`}
                    className="translations__table-row"
                  >
                    <div className="translations__col-name translations__cell-name">
                      <span className="translations__entity-name">{primaryName}</span>
                    </div>
                    {displayLanguages.map((lang) => {
                      const hasTranslation = translations.some((t) => t.language_code === lang)
                      return (
                        <div key={lang} className="translations__col-lang">
                          <button
                            type="button"
                            className={`translations__badge${hasTranslation ? " translations__badge--present" : " translations__badge--missing"}`}
                            onClick={() =>
                              handleBadgeClick(
                                entityType,
                                entity as AdminMenuWithTranslations,
                                lang,
                              )
                            }
                            title={
                              hasTranslation
                                ? strings.translations.badge.edit(LANGUAGE_NAMES[lang] ?? lang)
                                : strings.translations.badge.add(LANGUAGE_NAMES[lang] ?? lang)
                            }
                          >
                            {lang.toUpperCase()}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {tabLoading && (
              <div className="translations__loading-overlay">
                <span>{strings.translations.loading}</span>
              </div>
            )}
          </div>
        )
      )}

      {modal && (
        <TranslationEditModal
          entityType={modal.entityType}
          entity={modal.entity}
          languageCode={modal.languageCode}
          languageName={modal.languageName}
          primaryLanguage={locale}
          existingTranslation={modal.existingTranslation}
          onClose={() => setModal(null)}
          onSave={async (formData) => {
            const { entityType, entity, languageCode, existingTranslation } = modal
            const publicId = (entity as Record<string, unknown>).public_id as string
            const list = getEntityList(entityType)
            const snapshot = structuredClone(list)
            setEntityList(
              entityType,
              optimisticallyUpdateTranslation(list, publicId, languageCode, formData),
            )
            const isNew = !existingTranslation
            try {
              if (isNew) {
                switch (entityType) {
                  case "menu":
                    await menuApi.createMenuTranslation(publicId, {
                      language_code: languageCode,
                      name: formData.name,
                    })
                    break
                  case "category":
                    await menuApi.createCategoryTranslation(publicId, {
                      language_code: languageCode,
                      name: formData.name,
                    })
                    break
                  case "item":
                    await menuApi.createItemTranslation(publicId, {
                      language_code: languageCode,
                      name: formData.name,
                      description: formData.description ?? null,
                    })
                    break
                  case "allergen":
                    await menuApi.createAllergenTranslation(publicId, {
                      language_code: languageCode,
                      name: formData.name,
                    })
                    break
                  case "ingredient":
                    await menuApi.createIngredientTranslation(publicId, {
                      language_code: languageCode,
                      name: formData.name,
                    })
                    break
                  case "restaurant":
                    await menuApi.createRestaurantTranslation(publicId, {
                      language_code: languageCode,
                      address: formData.address,
                    })
                    break
                  case "zone":
                    await menuApi.createZoneTranslation(publicId, {
                      language_code: languageCode,
                      name: formData.name,
                    })
                    break
                }
              } else {
                const current = Object.fromEntries(
                  Object.keys(formData).map((key) => [
                    key,
                    ((existingTranslation as Record<string, unknown>)[key] as string) ?? "",
                  ]),
                )
                const updatePayload = { current, updated: formData }
                switch (entityType) {
                  case "menu":
                    await menuApi.updateMenuTranslation(
                      publicId,
                      languageCode,
                      updatePayload as never,
                    )
                    break
                  case "category":
                    await menuApi.updateCategoryTranslation(
                      publicId,
                      languageCode,
                      updatePayload as never,
                    )
                    break
                  case "item":
                    await menuApi.updateItemTranslation(
                      publicId,
                      languageCode,
                      updatePayload as never,
                    )
                    break
                  case "allergen":
                    await menuApi.updateAllergenTranslation(
                      publicId,
                      languageCode,
                      updatePayload as never,
                    )
                    break
                  case "ingredient":
                    await menuApi.updateIngredientTranslation(
                      publicId,
                      languageCode,
                      updatePayload as never,
                    )
                    break
                  case "restaurant":
                    await menuApi.updateRestaurantTranslation(
                      publicId,
                      languageCode,
                      updatePayload as never,
                    )
                    break
                  case "zone":
                    await menuApi.updateZoneTranslation(
                      publicId,
                      languageCode,
                      updatePayload as never,
                    )
                    break
                }
              }
            } catch (err) {
              const isConflict = err instanceof Error && err.message.startsWith("CONFLICT:")
              if (isConflict) {
                try {
                  setEntityList(entityType, await fetchEntityList(entityType))
                } catch {
                  setEntityList(entityType, snapshot)
                }
              } else {
                setEntityList(entityType, snapshot)
              }
              throw err
            }
          }}
          onDelete={async () => {
            const { entityType, entity, languageCode } = modal
            const publicId = (entity as Record<string, unknown>).public_id as string
            const list = getEntityList(entityType)
            const snapshot = structuredClone(list)
            setEntityList(entityType, optimisticallyRemoveTranslation(list, publicId, languageCode))
            try {
              switch (entityType) {
                case "menu":
                  await menuApi.deleteMenuTranslation(publicId, languageCode)
                  break
                case "category":
                  await menuApi.deleteCategoryTranslation(publicId, languageCode)
                  break
                case "item":
                  await menuApi.deleteItemTranslation(publicId, languageCode)
                  break
                case "allergen":
                  await menuApi.deleteAllergenTranslation(publicId, languageCode)
                  break
                case "ingredient":
                  await menuApi.deleteIngredientTranslation(publicId, languageCode)
                  break
                case "restaurant":
                  await menuApi.deleteRestaurantTranslation(publicId, languageCode)
                  break
                case "zone":
                  await menuApi.deleteZoneTranslation(publicId, languageCode)
                  break
              }
            } catch (err) {
              setEntityList(entityType, snapshot)
              throw err
            }
          }}
        />
      )}
    </section>
  )
}

export default TranslationsSection
