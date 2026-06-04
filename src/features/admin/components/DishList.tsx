import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import type { AdminCategory, AdminMenuItem } from "../types"
import { useDndSensors } from "./useDndSensors"
import DishCard from "./DishCard"

type DishListProps = {
  items: AdminMenuItem[]
  categories: AdminCategory[]
  onEdit: (item: AdminMenuItem) => void
  onReorder: (activeId: string, overId: string) => void
}

const UNCATEGORIZED = "__none__"

function DishList({ items, categories, onEdit, onReorder }: DishListProps) {
  const sensors = useDndSensors()
  const categoryName = new Map(categories.map((c) => [c.public_id, c.name]))

  // Group items by category, keeping category order, with uncategorized last.
  const groups = new Map<string, AdminMenuItem[]>()
  for (const c of categories) groups.set(c.public_id, [])
  for (const item of items) {
    const key = item.category ?? UNCATEGORIZED
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onReorder(String(active.id), String(over.id))
  }

  return (
    <div className="menu-admin__dishes">
      {[...groups.entries()]
        .filter(([, list]) => list.length > 0)
        .map(([key, list]) => (
          <div key={key} className="menu-admin__group">
            <h3 className="menu-admin__group-title">
              {key === UNCATEGORIZED ? "Uncategorized" : (categoryName.get(key) ?? "—")}
            </h3>
            {/* A separate context per group keeps dragging within its category. */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={list.map((i) => i.public_id)} strategy={rectSortingStrategy}>
                <ul className="menu-admin__dish-grid">
                  {list.map((item) => (
                    <DishCard key={item.public_id} item={item} onEdit={onEdit} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        ))}
    </div>
  )
}

export default DishList
