import { useState } from "react"
import { LuPlus } from "react-icons/lu"
import { useMenuAdmin } from "../hooks/useMenuAdmin"
import AddMenuModal from "../components/AddMenuModal"
import MenuToolbar from "../components/MenuToolbar"
import "../components/SectionPlaceholder.css"
import "../components/menu.css"

function MenuSection() {
  const {
    menus,
    selectedMenuId,
    selectMenu,
    categories,
    loadingMenus,
    loadingCategories,
    error,
    reloadMenus,
  } = useMenuAdmin()
  const [addingMenu, setAddingMenu] = useState(false)

  const selectedMenu = menus.find((m) => m.public_id === selectedMenuId) ?? null

  return (
    <section className="admin-section">
      <header className="admin-section__header">
        <h1 className="admin-section__title">Menu</h1>
        <p className="admin-section__description">Manage menus, categories, and dishes.</p>
      </header>

      {error && <p className="menu-admin__error">{error}</p>}

      {loadingMenus ? (
        <p className="admin-section__description">Loading…</p>
      ) : (
        <>
          <div className="menu-admin__menus">
            {menus.map((m) => (
              <button
                key={m.public_id}
                type="button"
                className={`menu-admin__tab${
                  m.public_id === selectedMenuId ? " menu-admin__tab--active" : ""
                }`}
                onClick={() => selectMenu(m.public_id)}
              >
                {m.name}
                {!m.is_active && <span className="menu-admin__tab-badge">hidden</span>}
              </button>
            ))}
            <button
              type="button"
              className="menu-admin__tab menu-admin__tab--add"
              onClick={() => setAddingMenu(true)}
            >
              <LuPlus aria-hidden="true" />
              <span>Add menu</span>
            </button>
          </div>

          {selectedMenu && (
            <MenuToolbar
              key={selectedMenu.public_id}
              menu={selectedMenu}
              onChanged={reloadMenus}
              onDeleted={reloadMenus}
            />
          )}

          {menus.length === 0 ? (
            <p className="admin-section__description">No menus yet. Add one to start.</p>
          ) : (
            selectedMenu && (
              <>
                <h2 className="menu-admin__subtitle">Categories</h2>
                {loadingCategories ? (
                  <p className="admin-section__description">Loading…</p>
                ) : categories.length === 0 ? (
                  <p className="admin-section__description">No categories in this menu yet.</p>
                ) : (
                  <ul className="menu-admin__list">
                    {categories.map((c) => (
                      <li key={c.public_id} className="menu-admin__row">
                        <span className="menu-admin__row-name">{c.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )
          )}
        </>
      )}

      {addingMenu && (
        <AddMenuModal
          onClose={() => setAddingMenu(false)}
          onCreated={(menu) => {
            selectMenu(menu.public_id)
            reloadMenus()
          }}
        />
      )}
    </section>
  )
}

export default MenuSection
