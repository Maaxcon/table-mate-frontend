import type { ReactNode } from "react"
import { DndContext, closestCorners, useDroppable, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import type { AdminCategory, AdminMenuItem } from "../../types"
import { GROUP_DROP_PREFIX } from "../../hooks/useMenuAdmin"
import { useDndSensors } from "../../hooks/useDndSensors"
import DishCard from "../DishCard"

type DishListProps = {
  items: AdminMenuItem[]
  categories: AdminCategory[]
  onEdit: (item: AdminMenuItem) => void
  onReorder: (activeId: string, overId: string) => void
  // Dragging is turned off while a search filters the list (reordering a subset
  // would be confusing and wouldn't reflect the real order).
  reorderDisabled?: boolean
  selectedIds: Set<string>
  onToggleSelect: (publicId: string) => void
}

const UNCATEGORIZED = "__none__"

// A drop zone for one category. Wrapping the grid makes empty categories
// (and the gaps between cards) accept drops, so dishes can move between groups.
function GroupDropZone({ groupKey, children }: { groupKey: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${GROUP_DROP_PREFIX}${groupKey}` })
  return (
    <div ref={setNodeRef} className={`menu-admin__group-drop${isOver ? " is-over" : ""}`}>
      {children}
    </div>
  )
}

function DishList({
  items,
  categories,
  onEdit,
  onReorder,
  reorderDisabled = false,
  selectedIds,
  onToggleSelect,
}: DishListProps) {
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

  // While searching, keep it simple: only non-empty groups, no drop targets.
  // Otherwise show every category (even empty) so dishes can be dropped into it.
  const visibleGroups = [...groups.entries()].filter(([key, list]) => {
    if (list.length > 0) return true
    return !reorderDisabled && key !== UNCATEGORIZED
  })

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onReorder(String(active.id), String(over.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="menu-admin__dishes">
        {visibleGroups.map(([key, list]) => (
          <div key={key} className="menu-admin__group">
            <h3 className="menu-admin__group-title">
              {key === UNCATEGORIZED ? "Uncategorized" : (categoryName.get(key) ?? "—")}
            </h3>
            <GroupDropZone groupKey={key}>
              <SortableContext items={list.map((i) => i.public_id)} strategy={rectSortingStrategy}>
                <ul className="menu-admin__dish-grid">
                  {list.map((item) => (
                    <DishCard
                      key={item.public_id}
                      item={item}
                      onEdit={onEdit}
                      disabled={reorderDisabled}
                      selected={selectedIds.has(item.public_id)}
                      onToggleSelect={onToggleSelect}
                    />
                  ))}
                  {list.length === 0 && (
                    <li className="menu-admin__group-empty">Drag dishes here</li>
                  )}
                </ul>
              </SortableContext>
            </GroupDropZone>
          </div>
        ))}
      </div>
    </DndContext>
  )
}

export default DishList
