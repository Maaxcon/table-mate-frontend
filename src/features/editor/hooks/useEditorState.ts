import { useCallback, useReducer } from "react"
import type { EditorEntity } from "../types"
import {
  CANVAS_H,
  CANVAS_W,
  findFreePosition,
  generateId,
  GRID,
  minLabelSize,
  serializeEntities,
  TABLE_PRESETS,
  SIZE_CONSTRAINTS,
} from "../types"

export interface EditorState {
  entities: EditorEntity[]
  selectedId: string | null
  lastPublishedJson: object | null
  dirty: boolean
  activeTool: string | null
  // serverIds of tables the admin explicitly removed since the last load/publish.
  // Sent to the publish endpoint so only genuine deletions are conflict-checked.
  deletedServerIds: string[]
}

type Action =
  | { type: "ADD_ENTITY"; entity: EditorEntity }
  | { type: "UPDATE_ENTITY"; id: string; patch: Partial<EditorEntity> }
  | { type: "MOVE_ENTITY"; id: string; x: number; y: number; zoneId?: string }
  | { type: "REMOVE_ENTITY"; id: string }
  | { type: "SELECT_ENTITY"; id: string | null }
  | { type: "SET_TOOL"; tool: string | null }
  | { type: "PUBLISH_SUCCESS"; tableIdMap?: Record<string, string> }
  | { type: "PUBLISH_ROLLBACK"; previousState: EditorState }
  | { type: "SET_DIRTY"; dirty: boolean }
  | { type: "LOAD_ENTITIES"; entities: EditorEntity[]; publishedJson: object }
  | { type: "CLEAR" }

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
      const free = findFreePosition(action.entity, others, CANVAS_W / GRID, CANVAS_H / GRID)
      const placed = { ...action.entity, x: free.x, y: free.y }
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
      if (entity.type === "threshold" || entity.type === "portal") {
        x = Math.max(-1, Math.min(x, CANVAS_W / GRID + 1 - entity.w))
        y = Math.max(-1, Math.min(y, CANVAS_H / GRID + 1 - entity.h))
      } else {
        x = Math.max(0, Math.min(x, CANVAS_W / GRID - entity.w))
        y = Math.max(0, Math.min(y, CANVAS_H / GRID - entity.h))
      }
      const free = findFreePosition(
        { x, y, w: entity.w, h: entity.h },
        others,
        CANVAS_W / GRID,
        CANVAS_H / GRID,
      )
      const entities = state.entities.map((e) =>
        e.id === action.id ? { ...e, x: free.x, y: free.y } : e,
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
      const entities = map
        ? state.entities.map((e) => (map[e.id] ? { ...e, serverId: map[e.id] } : e))
        : state.entities
      return {
        ...state,
        entities,
        lastPublishedJson: serializeEntities(entities),
        dirty: false,
        deletedServerIds: [],
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
      }
    case "CLEAR":
      return {
        entities: [],
        selectedId: null,
        lastPublishedJson: null,
        dirty: false,
        activeTool: null,
        deletedServerIds: [],
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
}

export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState)

  const DEFAULT_SIZES: Partial<Record<EditorEntity["type"], { w: number; h: number }>> = {
    obstacle: { w: 4, h: 1 },
    threshold: { w: 3, h: 1 },
    portal: { w: 2, h: 2 },
  }

  const addEntity = useCallback(
    (type: EditorEntity["type"], gridX: number, gridY: number, extra?: Partial<EditorEntity>) => {
      const preset = TABLE_PRESETS[type]
      const defaultSize = preset ?? DEFAULT_SIZES[type]
      let x = gridX
      let y = gridY
      if (type !== "threshold" && type !== "portal") {
        const w = defaultSize?.w ?? 2
        const h = defaultSize?.h ?? 2
        x = Math.max(0, Math.min(x, CANVAS_W / GRID - w))
        y = Math.max(0, Math.min(y, CANVAS_H / GRID - h))
      }
      const entity: EditorEntity = {
        id: generateId(),
        type,
        x,
        y,
        w: defaultSize?.w ?? 2,
        h: defaultSize?.h ?? 2,
        capacity: preset?.defaultCapacity,
        rotation: 0,
        ...extra,
      }
      dispatch({ type: "ADD_ENTITY", entity })
      return entity
    },
    // TABLE_PRESETS and DEFAULT_SIZES are module-level constants
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
    (tableIdMap?: Record<string, string>) => dispatch({ type: "PUBLISH_SUCCESS", tableIdMap }),
    [],
  )

  const loadEntities = useCallback((entities: EditorEntity[], publishedJson: object) => {
    dispatch({ type: "LOAD_ENTITIES", entities, publishedJson })
  }, [])

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR" })
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
    dispatch,
  }
}
