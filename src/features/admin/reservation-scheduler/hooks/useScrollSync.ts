import { type RefObject, useEffect, useRef } from "react"

export function useScrollSync(
  refA: RefObject<HTMLDivElement | null>,
  refB: RefObject<HTMLDivElement | null>,
) {
  const ticking = useRef(false)
  const lastSource = useRef<"a" | "b" | null>(null)

  useEffect(() => {
    const elA = refA.current
    const elB = refB.current
    if (!elA || !elB) return

    const sync = (source: HTMLDivElement, target: HTMLDivElement, id: "a" | "b") => {
      if (lastSource.current === id) return
      lastSource.current = id
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        target.scrollLeft = source.scrollLeft
        ticking.current = false
        lastSource.current = null
      })
    }

    const onScrollA = () => sync(elA, elB, "a")
    const onScrollB = () => sync(elB, elA, "b")

    elA.addEventListener("scroll", onScrollA, { passive: true })
    elB.addEventListener("scroll", onScrollB, { passive: true })

    return () => {
      elA.removeEventListener("scroll", onScrollA)
      elB.removeEventListener("scroll", onScrollB)
    }
  }, [refA, refB])
}
