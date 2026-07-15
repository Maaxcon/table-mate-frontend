import { useEffect, useState } from "react"

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)
    return () => {
      window.clearTimeout(timer)
    }
  }, [value, delayMs])

  return debouncedValue
}

export { useDebouncedValue }
