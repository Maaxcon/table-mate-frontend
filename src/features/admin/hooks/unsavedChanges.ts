import { createContext, useContext } from "react"

type UnsavedChanges = {
  /** Sections call this to report whether they have unsaved edits. */
  setDirty: (dirty: boolean) => void
}

export const UnsavedChangesContext = createContext<UnsavedChanges>({ setDirty: () => {} })

export function useUnsavedChanges(): UnsavedChanges {
  return useContext(UnsavedChangesContext)
}
