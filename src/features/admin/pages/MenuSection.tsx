import { useMenuAdmin } from "../hooks/useMenuAdmin"
import "../components/SectionPlaceholder.css"
import "../components/menu.css"

function MenuSection() {
  const { menus, selectedMenuId, selectMenu, categories, loadingMenus, loadingCategories, error } =
    useMenuAdmin()

  return (
    <section className="admin-section">
      <header className="admin-section__header">
        <h1 className="admin-section__title">Menu</h1>
        <p className="admin-section__description">Manage menus, categories, and dishes.</p>
      </header>

      {error && <p className="menu-admin__error">{error}</p>}

      {loadingMenus ? (
        <p className="admin-section__description">Loading…</p>
      ) : menus.length === 0 ? (
        <p className="admin-section__description">No menus yet.</p>
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
          </div>

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
      )}
    </section>
  )
}

export default MenuSection
