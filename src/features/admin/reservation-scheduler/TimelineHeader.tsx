interface TimelineHeaderProps {
  hourStart: number
  hourEnd: number
}

export function TimelineHeader({ hourStart, hourEnd }: TimelineHeaderProps) {
  const hours: number[] = []
  for (let h = hourStart; h <= hourEnd; h++) {
    hours.push(h)
  }

  return (
    <div className="scheduler__timeline-header">
      <div className="scheduler__timeline-header-label" />
      {hours.map((h) => (
        <div key={h} className="scheduler__timeline-header-hour">
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  )
}
