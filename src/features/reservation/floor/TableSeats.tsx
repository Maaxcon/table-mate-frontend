// Chairs arranged around a table. Round tables get an even ring; square/rectangular
// ones seat guests along each edge so the chairs sit right against the table.
export function TableSeats({
  capacity,
  shape,
  size = 150,
}: {
  capacity: number
  shape: string
  size?: number
}) {
  const n = Math.max(0, Math.min(capacity, 14))

  if (shape === "round") {
    // Radius scales with the table so chairs sit just outside the edge at any
    // size (a fixed radius tucked them under larger tables).
    const radius = size / 2 + 10
    return (
      <span className="c-floor-plan__seats c-floor-plan__seats--ring" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <span
            key={i}
            className="c-floor-plan__seat"
            style={{
              transform: `translate(-50%, -50%) rotate(${(360 / n) * i}deg) translateY(-${radius}px)`,
            }}
          />
        ))}
      </span>
    )
  }

  // Square tables seat guests on all four sides for a balanced look.
  const per = Math.floor(n / 4)
  const counts = { top: per, bottom: per, left: per, right: per }
  const order: (keyof typeof counts)[] = ["top", "bottom", "left", "right"]
  for (let i = 0; i < n - per * 4; i++) counts[order[i]]++
  const { top, bottom, left, right } = counts

  const side = (cls: string, count: number) =>
    count > 0 && (
      <span className={`c-floor-plan__seats c-floor-plan__seats--${cls}`} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className="c-floor-plan__seat" />
        ))}
      </span>
    )

  return (
    <>
      {side("top", top)}
      {side("bottom", bottom)}
      {side("left", left)}
      {side("right", right)}
    </>
  )
}
