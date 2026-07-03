interface TimelineHeaderProps {
  hourStart: number
  hourEnd: number
  workingHourStart: number
  workingHourEnd: number
}

export function TimelineHeader({
  hourStart,
  hourEnd,
  workingHourStart,
  workingHourEnd,
}: TimelineHeaderProps) {
  const hours: number[] = []
  for (let h = hourStart; h <= hourEnd; h++) {
    hours.push(h)
  }

  return (
    <div className="scheduler__timeline-header">
      <div className="scheduler__timeline-header-label" />
      {hours.map((h) => {
        const isExtended = h < workingHourStart || h >= workingHourEnd
        return (
          <div
            key={h}
            className={`scheduler__timeline-header-hour${isExtended ? " scheduler__timeline-header-hour--extended" : ""}`}
          >
            {String(h).padStart(2, "0")}:00
          </div>
        )
      })}
    </div>
  )
}
