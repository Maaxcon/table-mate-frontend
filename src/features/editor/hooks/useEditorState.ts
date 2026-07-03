import { useCallback, useReducer } from "react"
import type { EditorEntity } from "../types"
import {
  DEFAULT_CANVAS_COLS,
  DEFAULT_CANVAS_ROWS,
  clampEntityToBackendLimits,
  findFreePosition,
  generateId,
  minLabelSize,
  rotatedAABB,
  serializeEntities,
  TABLE_PRESETS,
  SIZE_CONSTRAINTS,
} from "../types"

export interface PendingZoneCreate {
  _clientId: string
  name: string
  edge_styles: Record<string, "dashed" | "solid">
  canvas_cols: number
  canvas_rows: number
}

export type PendingZones = {
  created: PendingZoneCreate[]
  updated: Record<
    string,
    {
      name?: string
      edge_styles?: Record<string, "dashed" | "solid">
      canvas_cols?: number
      canvas_rows?: number
    }
  >
  deleted: string[]
}

export interface EditorState {
  entities: EditorEntity[]
  selectedId: string | null
  lastPublishedJson: object | null
  dirty: boolean
  activeTool: string | null
  // serverIds of tables the admin explicitly removed since the last load/publish.
  // Sent to the publish endpoint so only genuine deletions are conflict-checked.
  deletedServerIds: string[]
  /** Canvas dimensions in grid units (columns & rows). */
  canvasCols: number
  canvasRows: number
  /** Zone changes deferred to publish. */
  pendingZones: PendingZones
}

type Action =
  | { type: "ADD_ENTITY"; entity: EditorEntity }
  | { type: "UPDATE_ENTITY"; id: string; patch: Partial<EditorEntity> }
  | { type: "MOVE_ENTITY"; id: string; x: number; y: number; zoneId?: string }
  | { type: "REMOVE_ENTITY"; id: string }
  | { type: "SELECT_ENTITY"; id: string | null }
  | { type: "SET_TOOL"; tool: string | null }
  | {
      type: "PUBLISH_SUCCESS"
      tableIdMap?: Record<string, string>
      publicNumberMap?: Record<string, string>
    }
  | { type: "PUBLISH_ROLLBACK"; previousState: EditorState }
  | { type: "SET_DIRTY"; dirty: boolean }
  | {
      type: "LOAD_ENTITIES"
      entities: EditorEntity[]
      publishedJson: object
      canvasCols?: number
      canvasRows?: number
    }
  | { type: "SET_CANVAS_SIZE"; cols: number; rows: number }
  | { type: "REMOVE_ENTITIES_BY_ZONE"; zoneId: string }
  | { type: "CLEAR" }
  | { type: "CREATE_ZONE"; zone: PendingZoneCreate }
  | { type: "UPDATE_ZONE_META"; zoneId: string; patch: Record<string, unknown> }
  | { type: "DELETE_ZONE"; zoneId: string }
  | { type: "CLEAR_PENDING_ZONES" }
  | { type: "REMAP_ZONE_ID"; from: string; to: string }

const TABLE_LABEL_REGEX = /^T(\d+)$/i

function getNextTableLabel(entities: EditorEntity[]): string {
  let max = 0
  for (const entity of entities) {
    if (!entity.type.startsWith("table")) continue
    const label = entity.label?.trim()
    if (!label) continue
    const match = TABLE_LABEL_REGEX.exec(label)
    if (!match) continue
    const value = Number.parseInt(match[1], 10)
    if (!Number.isNaN(value)) {
      max = Math.max(max, value)
    }
  }
  return `T${max + 1}`
}

function computeDirty(entities: EditorEntity[], lastPublishedJson: object | null): boolean {
  if (!lastPublishedJson) return entities.length > 0
  const current = serializeEntities(entities)
  return JSON.stringify(current) !== JSON.stringify(lastPublishedJson)
}

function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "ADD_ENTITY": {
      const entityZoneId = action.entity.zoneId
      const others = entityZoneId
        ? state.entities.filter((e) => e.zoneId === entityZoneId)
        : state.entities
      const free = findFreePosition(
        { ...action.entity },
        others,
        state.canvasCols,
        state.canvasRows,
      )
      const clamped = clampEntityToBackendLimits(
        free.x,
        free.y,
        action.entity.type,
        state.canvasCols,
        state.canvasRows,
      )
      const placed = { ...action.entity, x: clamped.x, y: clamped.y }
      const entities = [...state.entities, placed]
      return {
        ...state,
        entities,
        selectedId: placed.id,
        dirty: computeDirty(entities, state.lastPublishedJson),
      }
    }
    case "UPDATE_ENTITY": {
      const entities = state.entities.map((e) => {
        if (e.id !== action.id) return e
        const updated = { ...e, ...action.patch }
        if (action.patch.label !== undefined) {
          const minW = minLabelSize(action.patch.label)
          updated.w = Math.max(updated.w, minW)
          updated.h = Math.max(updated.h, 1)
        }
        const c = SIZE_CONSTRAINTS[updated.type]
        if (c) {
          updated.w = Math.max(c.minW, Math.min(c.maxW, updated.w))
          updated.h = Math.max(c.minH, Math.min(c.maxH, updated.h))
          if (c.lockAspect) {
            const side = Math.max(updated.w, updated.h)
            updated.w = side
            updated.h = side
          }
        }
        if (
          action.patch.rotation !== undefined ||
          action.patch.w !== undefined ||
          action.patch.h !== undefined
        ) {
          const aabb = rotatedAABB(updated.x, updated.y, updated.w, updated.h, updated.rotation)
          const ox = (aabb.w - updated.w) / 2
          const oy = (aabb.h - updated.h) / 2
          if (updated.type === "threshold" || updated.type === "portal") {
            updated.x = Math.max(-1, Math.min(aabb.x, state.canvasCols + 1 - aabb.w)) + ox
            updated.y = Math.max(-1, Math.min(aabb.y, state.canvasRows + 1 - aabb.h)) + oy
          } else {
            updated.x = Math.max(0, Math.min(aabb.x, state.canvasCols - aabb.w)) + ox
            updated.y = Math.max(0, Math.min(aabb.y, state.canvasRows - aabb.h)) + oy
          }
          const others = state.entities.filter(
            (e) => e.id !== action.id && e.zoneId === updated.zoneId,
          )
          const free = findFreePosition(
            { x: updated.x, y: updated.y, w: updated.w, h: updated.h, rotation: updated.rotation },
            others,
            state.canvasCols,
            state.canvasRows,
          )
          const clamped = clampEntityToBackendLimits(
            free.x,
            free.y,
            updated.type,
            state.canvasCols,
            state.canvasRows,
          )
          updated.x = clamped.x
          updated.y = clamped.y
        }
        return updated
      })
      return { ...state, entities, dirty: computeDirty(entities, state.lastPublishedJson) }
    }
    case "MOVE_ENTITY": {
      const entity = state.entities.find((e) => e.id === action.id)
      if (!entity) return state
      const moveZoneId = action.zoneId ?? entity.zoneId
      const others = state.entities.filter(
        (e) => e.id !== action.id && (!moveZoneId || e.zoneId === moveZoneId),
      )
      let { x, y } = action
      // Clamp the entity's AABB to stay within canvas, then convert back to entity
      // position. The offset between entity top-left and AABB top-left is constant
      // for a given size + rotation:  entityX = aabbX + (envW - entityW) / 2.
      const aabb = rotatedAABB(x, y, entity.w, entity.h, entity.rotation)
      const offsetX = (aabb.w - entity.w) / 2
      const offsetY = (aabb.h - entity.h) / 2
      if (entity.type === "threshold" || entity.type === "portal") {
        x = Math.max(-1, Math.min(aabb.x, state.canvasCols + 1 - aabb.w)) + offsetX
        y = Math.max(-1, Math.min(aabb.y, state.canvasRows + 1 - aabb.h)) + offsetY
      } else {
        x = Math.max(0, Math.min(aabb.x, state.canvasCols - aabb.w)) + offsetX
        y = Math.max(0, Math.min(aabb.y, state.canvasRows - aabb.h)) + offsetY
      }
      const free = findFreePosition(
        { x, y, w: entity.w, h: entity.h, rotation: entity.rotation },
        others,
        state.canvasCols,
        state.canvasRows,
      )
      const clamped = clampEntityToBackendLimits(
        free.x,
        free.y,
        entity.type,
        state.canvasCols,
        state.canvasRows,
      )
      const entities = state.entities.map((e) =>
        e.id === action.id ? { ...e, x: clamped.x, y: clamped.y } : e,
      )
      return { ...state, entities, dirty: computeDirty(entities, state.lastPublishedJson) }
    }
    case "REMOVE_ENTITY": {
      const removed = state.entities.find((e) => e.id === action.id)
      const entities = state.entities.filter((e) => e.id !== action.id)
      const deletedServerIds =
        removed?.serverId && !state.deletedServerIds.includes(removed.serverId)
          ? [...state.deletedServerIds, removed.serverId]
          : state.deletedServerIds
      return {
        ...state,
        entities,
        deletedServerIds,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        dirty: computeDirty(entities, state.lastPublishedJson),
      }
    }
    case "SELECT_ENTITY":
      return { ...state, selectedId: action.id }
    case "SET_TOOL":
      return { ...state, activeTool: action.tool, selectedId: null }
    case "PUBLISH_SUCCESS": {
      // Apply the server-assigned ids for newly created tables and snapshot the
      // published JSON from the *resulting* entities in one step. Doing both
      // atomically here (rather than snapshot-then-UPDATE_ENTITY in the caller)
      // avoids a false dirty: serializeEntities writes a table id as
      // `serverId || null`, so a snapshot taken before the ids land would differ
      // from state once they do.
      const map = action.tableIdMap
      let entities = map
        ? state.entities.map((e) => (map[e.id] ? { ...e, serverId: map[e.id] } : e))
        : state.entities
      // Apply public numbers from the publish response so tables without a
      // user-entered label immediately show their server-assigned number.
      const pnMap = action.publicNumberMap
      if (pnMap) {
        entities = entities.map((e) => {
          const pn = pnMap[e.id]
          if (pn) return { ...e, label: pn }
          return e
        })
      }
      return {
        ...state,
        entities,
        lastPublishedJson: serializeEntities(entities),
        dirty: false,
        deletedServerIds: [],
        pendingZones: { created: [], updated: {}, deleted: [] },
      }
    }
    case "PUBLISH_ROLLBACK":
      return { ...action.previousState }
    case "SET_DIRTY":
      return { ...state, dirty: action.dirty }
    case "LOAD_ENTITIES":
      return {
        ...state,
        entities: action.entities,
        lastPublishedJson: action.publishedJson,
        dirty: false,
        deletedServerIds: [],
        canvasCols: action.canvasCols ?? state.canvasCols,
        canvasRows: action.canvasRows ?? state.canvasRows,
        pendingZones: { created: [], updated: {}, deleted: [] },
      }
    case "SET_CANVAS_SIZE": {
      const reclamped = state.entities.map((e) => {
        const { x, y } = clampEntityToBackendLimits(e.x, e.y, e.type, action.cols, action.rows)
        let { w, h } = e
        if (x + w > action.cols) w = Math.max(1, action.cols - x)
        if (y + h > action.rows) h = Math.max(1, action.rows - y)
        if (w !== e.w || h !== e.h || x !== e.x || y !== e.y) {
          return { ...e, x, y, w, h }
        }
        return e
      })
      return {
        ...state,
        canvasCols: action.cols,
        canvasRows: action.rows,
        entities: reclamped,
        dirty: computeDirty(reclamped, state.lastPublishedJson),
      }
    }
    case "REMOVE_ENTITIES_BY_ZONE": {
      const remaining = state.entities.filter((e) => e.zoneId !== action.zoneId)
      return {
        ...state,
        entities: remaining,
        dirty: computeDirty(remaining, state.lastPublishedJson),
        selectedId:
          state.selectedId && remaining.every((e) => e.id !== state.selectedId)
            ? null
            : state.selectedId,
      }
    }
    case "CREATE_ZONE": {
      return {
        ...state,
        pendingZones: {
          ...state.pendingZones,
          created: [...state.pendingZones.created, action.zone],
        },
        dirty: true,
      }
    }
    case "UPDATE_ZONE_META": {
      const createdIndex = state.pendingZones.created.findIndex(
        (z) => z._clientId === action.zoneId,
      )
      if (createdIndex >= 0) {
        const created = [...state.pendingZones.created]
        created[createdIndex] = { ...created[createdIndex], ...action.patch }
        return { ...state, pendingZones: { ...state.pendingZones, created }, dirty: true }
      }
      return {
        ...state,
        pendingZones: {
          ...state.pendingZones,
          updated: {
            ...state.pendingZones.updated,
            [action.zoneId]: {
              ...state.pendingZones.updated[action.zoneId],
              ...action.patch,
            },
          },
        },
        dirty: true,
      }
    }
    case "DELETE_ZONE": {
      const inCreated = state.pendingZones.created.some((z) => z._clientId === action.zoneId)
      const pendingZones = inCreated
        ? {
            ...state.pendingZones,
            created: state.pendingZones.created.filter((z) => z._clientId !== action.zoneId),
          }
        : {
            ...state.pendingZones,
            deleted: state.pendingZones.deleted.includes(action.zoneId)
              ? state.pendingZones.deleted
              : [...state.pendingZones.deleted, action.zoneId],
          }
      const entities = state.entities.filter((e) => e.zoneId !== action.zoneId)
      return {
        ...state,
        entities,
        pendingZones,
        selectedId:
          state.selectedId && entities.every((e) => e.id !== state.selectedId)
            ? null
            : state.selectedId,
        dirty: true,
      }
    }
    case "CLEAR_PENDING_ZONES":
      return {
        ...state,
        pendingZones: { created: [], updated: {}, deleted: [] },
        dirty: computeDirty(state.entities, state.lastPublishedJson),
      }
    case "REMAP_ZONE_ID": {
      const entities = state.entities.map((e) =>
        e.zoneId === action.from ? { ...e, zoneId: action.to } : e,
      )
      return { ...state, entities }
    }
    case "CLEAR":
      return {
        entities: [],
        selectedId: null,
        lastPublishedJson: null,
        dirty: false,
        activeTool: null,
        deletedServerIds: [],
        canvasCols: DEFAULT_CANVAS_COLS,
        canvasRows: DEFAULT_CANVAS_ROWS,
        pendingZones: { created: [], updated: {}, deleted: [] },
      }
    default:
      return state
  }
}

const initialState: EditorState = {
  entities: [],
  selectedId: null,
  lastPublishedJson: null,
  dirty: false,
  activeTool: null,
  deletedServerIds: [],
  canvasCols: DEFAULT_CANVAS_COLS,
  canvasRows: DEFAULT_CANVAS_ROWS,
  pendingZones: { created: [], updated: {}, deleted: [] },
}

const DEFAULT_ENTITY_SIZES: Partial<Record<EditorEntity["type"], { w: number; h: number }>> = {
  obstacle: { w: 4, h: 1 },
  threshold: { w: 3, h: 1 },
  portal: { w: 2, h: 2 },
}

export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState)

  const addEntity = useCallback(
    (type: EditorEntity["type"], gridX: number, gridY: number, extra?: Partial<EditorEntity>) => {
      const preset = TABLE_PRESETS[type]
      const defaultSize = preset ?? DEFAULT_ENTITY_SIZES[type]
      const x = gridX
      const y = gridY
      const needsAutoLabel =
        type.startsWith("table") && (extra?.label == null || extra.label === "")
      const finalExtra = needsAutoLabel
        ? { ...extra, label: getNextTableLabel(state.entities) }
        : extra
      const entity: EditorEntity = {
        id: generateId(),
        type,
        x,
        y,
        w: defaultSize?.w ?? 2,
        h: defaultSize?.h ?? 2,
        capacity: preset?.defaultCapacity,
        rotation: 0,
        ...(finalExtra ?? {}),
      }
      dispatch({ type: "ADD_ENTITY", entity })
      return entity
    },
    [state.entities],
  )

  const updateEntity = useCallback((id: string, patch: Partial<EditorEntity>) => {
    dispatch({ type: "UPDATE_ENTITY", id, patch })
  }, [])

  const moveEntity = useCallback((id: string, x: number, y: number, zoneId?: string) => {
    dispatch({ type: "MOVE_ENTITY", id, x, y, zoneId })
  }, [])

  const removeEntity = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ENTITY", id })
  }, [])

  const selectEntity = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_ENTITY", id })
  }, [])

  const setTool = useCallback((tool: string | null) => {
    dispatch({ type: "SET_TOOL", tool })
  }, [])

  const publishSuccess = useCallback(
    (tableIdMap?: Record<string, string>, publicNumberMap?: Record<string, string>) =>
      dispatch({ type: "PUBLISH_SUCCESS", tableIdMap, publicNumberMap }),
    [],
  )

  const loadEntities = useCallback(
    (entities: EditorEntity[], publishedJson: object, canvasCols?: number, canvasRows?: number) => {
      dispatch({ type: "LOAD_ENTITIES", entities, publishedJson, canvasCols, canvasRows })
    },
    [],
  )

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR" })
  }, [])

  const removeEntitiesByZone = useCallback((zoneId: string) => {
    dispatch({ type: "REMOVE_ENTITIES_BY_ZONE", zoneId })
  }, [])

  const createZone = useCallback((clientId: string, name: string) => {
    const zone: PendingZoneCreate = {
      _clientId: clientId,
      name,
      edge_styles: { top: "dashed", right: "dashed", bottom: "dashed", left: "dashed" },
      canvas_cols: DEFAULT_CANVAS_COLS,
      canvas_rows: DEFAULT_CANVAS_ROWS,
    }
    dispatch({ type: "CREATE_ZONE", zone })
  }, [])

  const updateZoneMeta = useCallback((zoneId: string, patch: Record<string, unknown>) => {
    dispatch({ type: "UPDATE_ZONE_META", zoneId, patch })
  }, [])

  const deleteZone = useCallback((zoneId: string) => {
    dispatch({ type: "DELETE_ZONE", zoneId })
  }, [])

  const clearPendingZones = useCallback(() => {
    dispatch({ type: "CLEAR_PENDING_ZONES" })
  }, [])

  return {
    ...state,
    addEntity,
    updateEntity,
    moveEntity,
    removeEntity,
    selectEntity,
    setTool,
    publishSuccess,
    loadEntities,
    clearAll,
    removeEntitiesByZone,
    createZone,
    updateZoneMeta,
    deleteZone,
    clearPendingZones,
    dispatch,
  }
}
