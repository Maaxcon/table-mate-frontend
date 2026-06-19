export const GRID = 100
export const CANVAS_W = 2000
export const CANVAS_H = 2000
export const OVERHANG = GRID

export type EntityType = "table-square" | "table-round" | "obstacle" | "threshold" | "portal"

export type Tool = EntityType | "select" | "pan"

export interface EditorEntity {
  id: string
  serverId?: string
  type: EntityType
  x: number
  y: number
  w: number
  h: number
  label?: string
  capacity?: number
  sector?: string
  tags?: string[]
  zoneId?: string
  targetZoneId?: string
  rotation?: number
}

export const TABLE_PRESETS: Record<
  string,
  { w: number; h: number; label: string; defaultCapacity: number }
> = {
  "table-square": { w: 3, h: 3, label: "Table 3×3", defaultCapacity: 4 },
  "table-round": { w: 3, h: 3, label: "Round 3×3", defaultCapacity: 4 },
}

export const SIZE_CONSTRAINTS: Record<
  EntityType,
  { minW: number; minH: number; maxW: number; maxH: number; lockAspect?: boolean }
> = {
  "table-square": { minW: 2, minH: 2, maxW: 8, maxH: 8 },
  "table-round": { minW: 2, minH: 2, maxW: 6, maxH: 6, lockAspect: true },
  obstacle: { minW: 2, minH: 1, maxW: 8, maxH: 2 },
  threshold: { minW: 1, minH: 1, maxW: 8, maxH: 4 },
  portal: { minW: 1, minH: 1, maxW: 4, maxH: 4 },
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function snap(val: number): number {
  return Math.round(val / GRID) * GRID
}

export function serializeEntities(entities: EditorEntity[]): object {
  const tables: object[] = []
  const obstacles: object[] = []
  const thresholds: object[] = []
  const portals: object[] = []

  for (const e of entities) {
    const base = {
      x: e.x * GRID,
      y: e.y * GRID,
      width: e.w * GRID,
      height: e.h * GRID,
      rotation: e.rotation ?? 0,
      zone_id: e.zoneId ?? null,
    }

    if (e.type === "table-square" || e.type === "table-round") {
      tables.push({
        ...base,
        id: e.serverId ?? null,
        public_number: e.label ?? "",
        shape: e.type === "table-round" ? "round" : "square",
        capacity: e.capacity ?? 4,
        tags: e.tags ?? [],
      })
    } else if (e.type === "obstacle") {
      obstacles.push(base)
    } else if (e.type === "threshold") {
      thresholds.push(base)
    } else if (e.type === "portal") {
      portals.push({
        ...base,
        target_zone_id: e.targetZoneId ?? null,
        label: e.label ?? "",
      })
    }
  }

  return { tables, obstacles, thresholds, portals }
}

export interface LayoutPayload {
  tables: Array<{
    id: string | null
    public_number: string
    x: number
    y: number
    width: number
    height: number
    rotation: number
    shape: string
    capacity: number
    zone_id: string | null
    tags: string[]
  }>
  obstacles: Array<{
    x: number
    y: number
    width: number
    height: number
    rotation: number
    zone_id: string | null
  }>
  thresholds: Array<{
    x: number
    y: number
    width: number
    height: number
    zone_id: string | null
  }>
  portals: Array<{
    x: number
    y: number
    width: number
    height: number
    target_zone_id: string | null
    label: string
    zone_id: string | null
  }>
}

export function deserializeLayout(layout: LayoutPayload): EditorEntity[] {
  const entities: EditorEntity[] = []

  for (const t of layout.tables) {
    const type = t.shape === "round" ? "table-round" : "table-square"
    entities.push({
      id: t.id ?? generateId(),
      serverId: t.id ?? undefined,
      type,
      x: Math.round(t.x / GRID),
      y: Math.round(t.y / GRID),
      w: Math.round(t.width / GRID),
      h: Math.round(t.height / GRID),
      label: t.public_number || undefined,
      capacity: t.capacity,
      tags: t.tags,
      zoneId: t.zone_id ?? undefined,
      rotation: t.rotation,
    })
  }

  for (const o of layout.obstacles) {
    entities.push({
      id: generateId(),
      type: "obstacle",
      x: Math.round(o.x / GRID),
      y: Math.round(o.y / GRID),
      w: Math.round(o.width / GRID),
      h: Math.round(o.height / GRID),
      rotation: o.rotation,
      zoneId: o.zone_id ?? undefined,
    })
  }

  for (const th of layout.thresholds) {
    entities.push({
      id: generateId(),
      type: "threshold",
      x: Math.round(th.x / GRID),
      y: Math.round(th.y / GRID),
      w: Math.round(th.width / GRID),
      h: Math.round(th.height / GRID),
      zoneId: th.zone_id ?? undefined,
    })
  }

  for (const p of layout.portals) {
    entities.push({
      id: generateId(),
      type: "portal",
      x: Math.round(p.x / GRID),
      y: Math.round(p.y / GRID),
      w: Math.round(p.width / GRID),
      h: Math.round(p.height / GRID),
      targetZoneId: p.target_zone_id ?? undefined,
      label: p.portal_label || p.label || undefined,
      zoneId: p.zone_id ?? undefined,
    })
  }

  return entities
}

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function findFreePosition(
  desired: { x: number; y: number; w: number; h: number },
  others: Array<{ x: number; y: number; w: number; h: number }>,
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  if (!others.some((o) => rectsOverlap(desired, o))) {
    return { x: desired.x, y: desired.y }
  }

  for (let step = 1; step < 100; step++) {
    const candidates = [
      { x: desired.x + step, y: desired.y },
      { x: desired.x - step, y: desired.y },
      { x: desired.x, y: desired.y + step },
      { x: desired.x, y: desired.y - step },
    ]
    for (const pos of candidates) {
      if (pos.x < 0 || pos.y < 0 || pos.x + desired.w > canvasW || pos.y + desired.h > canvasH)
        continue
      if (!others.some((o) => rectsOverlap({ ...desired, x: pos.x, y: pos.y }, o))) {
        return pos
      }
    }
  }

  return { x: desired.x, y: desired.y }
}

export function minLabelSize(label: string | undefined | null): number {
  if (!label) return 1
  return Math.max(1, Math.ceil(label.length * 0.1 + 0.5))
}

export function entityHasLabel(type: EntityType): boolean {
  return type === "portal"
}

export function entityHasProperties(type: EntityType): boolean {
  return type.startsWith("table")
}
