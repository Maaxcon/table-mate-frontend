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
  threshold: { minW: 1, minH: 1, maxW: 8, maxH: 1 },
  portal: { minW: 1, minH: 1, maxW: 4, maxH: 4 },
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function snap(val: number): number {
  return Math.round(val / GRID) * GRID
}

export function serializeEntities(entities: EditorEntity[]): object {
  return {
    version: 1,
    tables: entities.map((e) => ({
      id: e.id,
      server_id: e.serverId ?? null,
      type: e.type,
      x: e.x,
      y: e.y,
      w: e.w,
      h: e.h,
      label: e.label ?? null,
      capacity: e.capacity ?? null,
      sector: e.sector ?? null,
      tags: e.tags ?? [],
      zone_id: e.zoneId ?? null,
      target_zone_id: e.targetZoneId ?? null,
      rotation: e.rotation ?? 0,
    })),
  }
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
