import { useEffect, useState } from "react"
import { fetchAllergens } from "../api/menu"
import { ALLERGEN_OPTIONS } from "../constants/allergenOptions"

// The backend (apps/menu/allergens.py) is the source of truth; the static list
// is only a fallback used before the fetch resolves or if it fails.
export function useAllergens(): string[] {
  const [list, setList] = useState<string[]>([...ALLERGEN_OPTIONS])

  useEffect(() => {
    const controller = new AbortController()
    fetchAllergens(controller.signal)
      .then((values) => {
        if (values.length) setList(values)
      })
      .catch(() => {
        // keep the fallback list
      })
    return () => controller.abort()
  }, [])

  return list
}
