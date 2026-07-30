import { useEffect, useState, useCallback } from "react"
import "@/features/admin/components/styles/translations.css"
import { api } from "@/api/client"
import { useAdminStrings } from "@/features/admin/strings"
import TranslationEditModal from "@/features/admin/components/TranslationEditModal"
import {
  fetchMenusWithTranslations,
  fetchCategoriesWithTranslations,
  fetchItemsWithTranslations,
  fetchAdminAllergens,
  fetchAdminIngredients,
} from "@/features/admin/api/menu"
import type {
  AdminAllergen,
  AdminCategoryWithTranslations,
  AdminIngredient,
  AdminMenuItemWithTranslations,
  AdminMenuWithTranslations,
  AllergenTranslation,
  IngredientTranslation,
  MenuCategoryTranslation,
  MenuItemTranslation,
  MenuTranslation,
} from "@/features/admin/types"

type EntityType = "menu" | "category" | "item" | "allergen" | "ingredient"

type Translation =
  | MenuTranslation
  | MenuCategoryTranslation
  | MenuItemTranslation
  | AllergenTranslation
  | IngredientTranslation

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  uk: "Українська",
  de: "Deutsch",
  fr: "Français",
  pl: "Polski",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  ro: "Română",
  bg: "Български",
  cs: "Čeština",
  da: "Dansk",
  el: "Ελληνικά",
  et: "Eesti",
  fi: "Suomi",
  hu: "Magyar",
  lt: "Lietuvių",
  lv: "Latviešu",
  sk: "Slovenčina",
  sl: "Slovenščina",
  sv: "Svenska",
  tr: "Türkçe",
}

type TabKey = "menu" | "category" | "item" | "allergen" | "ingredient"

const TABS: { key: TabKey; label: string }[] = [
  { key: "menu", label: "Menus" },
  { key: "category", label: "Categories" },
  { key: "item", label: "Items" },
  { key: "allergen", label: "Allergens" },
  { key: "ingredient", label: "Ingredients" },
]

type TranslationModalState = {
  entityType: EntityType
  entity:
    | AdminMenuWithTranslations
    | AdminCategoryWithTranslations
    | AdminMenuItemWithTranslations
    | AdminAllergen
    | AdminIngredient
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
    | AdminIngredient,
): string {
  if ("name" in entity) return entity.name ?? ""
  if ("key" in entity) return entity.key
  return ""
}

function getEntityId(entity: Record<string, unknown>): string {
  return (entity.public_id as string) ?? (entity.key as string) ?? ""
}

function TranslationsSection() {
  const strings = useAdminStrings()

  const [locale, setLocale] = useState<string>("en")
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([])
  const [menus, setMenus] = useState<AdminMenuWithTranslations[]>([])
  const [categories, setCategories] = useState<AdminCategoryWithTranslations[]>([])
  const [items, setItems] = useState<AdminMenuItemWithTranslations[]>([])
  const [allergens, setAllergens] = useState<AdminAllergen[]>([])
  const [ingredients, setIngredients] = useState<AdminIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("menu")
  const [modal, setModal] = useState<TranslationModalState | null>(null)

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [settingsList, menusData, categoriesData, itemsData, allergensData, ingredientsData] =
        await Promise.all([
          api.getList<{ locale: string; supported_languages: string[] }>(
            "/api/restaurants/restaurant-settings/",
            { signal },
          ),
          fetchMenusWithTranslations(signal),
          fetchCategoriesWithTranslations(signal),
          fetchItemsWithTranslations(signal),
          fetchAdminAllergens(signal),
          fetchAdminIngredients(signal),
        ])
      const settings = settingsList[0] ?? {}
      setLocale(settings.locale ?? "en")
      setSupportedLanguages(settings.supported_languages ?? [])
      setMenus(menusData)
      setCategories(categoriesData)
      setItems(itemsData)
      setAllergens(allergensData)
      setIngredients(ingredientsData)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Failed to load data.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(controller.signal)
    return () => controller.abort()
  }, [loadData])

  const handleBadgeClick = (
    entityType: EntityType,
    entity:
      | AdminMenuWithTranslations
      | AdminCategoryWithTranslations
      | AdminMenuItemWithTranslations
      | AdminAllergen
      | AdminIngredient,
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
    }
  }

  const { list, entityType } = getCurrentEntities()

  if (loading) {
    return (
      <section className="admin-section">
        <header className="admin-section__header">
          <h1 className="admin-section__title">Translations</h1>
          <p className="admin-section__description">{strings.common.loading}</p>
        </header>
      </section>
    )
  }

  if (error) {
    return (
      <section className="admin-section">
        <header className="admin-section__header">
          <h1 className="admin-section__title">Translations</h1>
          <p className="admin-form__status admin-form__status--error">{error}</p>
        </header>
      </section>
    )
  }

  const displayLanguages = supportedLanguages.filter((l) => l !== locale)

  return (
    <section className="admin-section">
      <header className="admin-section__header">
        <h1 className="admin-section__title">Translations</h1>
        <p className="admin-section__description">
          Primary language: <strong>{LANGUAGE_NAMES[locale] ?? locale}</strong>
        </p>
      </header>

      <div className="translations__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`translations__tab${activeTab === tab.key ? " translations__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {displayLanguages.length === 0 && (
        <p className="admin-section__description">
          No additional languages configured. Add languages in Settings to enable translations.
        </p>
      )}

      {displayLanguages.length > 0 && (
        <div className="translations__table">
          <div className="translations__table-header">
            <div className="translations__col-name">Name</div>
            {displayLanguages.map((lang) => (
              <div key={lang} className="translations__col-lang">
                {LANGUAGE_NAMES[lang] ?? lang}
              </div>
            ))}
          </div>

          {(list as Array<Record<string, unknown>>).length === 0 && (
            <p className="admin-section__description">No {activeTab}s found.</p>
          )}

          {(list as Array<Record<string, unknown>>).map((entity: Record<string, unknown>) => {
            const translations = getTranslations(entity as { translations?: Translation[] })
            const primaryName = getEntityName(entity as AdminMenuWithTranslations)

            return (
              <div key={`${entityType}-${getEntityId(entity)}`} className="translations__table-row">
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
                          handleBadgeClick(entityType, entity as AdminMenuWithTranslations, lang)
                        }
                        title={
                          hasTranslation
                            ? `Edit ${LANGUAGE_NAMES[lang] ?? lang} translation`
                            : `Add ${LANGUAGE_NAMES[lang] ?? lang} translation`
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
          onSaved={() => loadData()}
        />
      )}
    </section>
  )
}

export default TranslationsSection
