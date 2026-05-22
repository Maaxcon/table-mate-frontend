import "./StatusChip.css"

type StatusValue = "pending" | "in_progress" | "ready" | "served" | "voided"

interface StatusChipProps {
  status: StatusValue
}

const LABELS: Record<StatusValue, string> = {
  pending: "PENDING",
  in_progress: "IN PROGRESS",
  ready: "READY",
  served: "SERVED",
  voided: "VOIDED",
}

export function StatusChip({ status }: StatusChipProps) {
  const label = status === "served" ? "SERVED \u2713" : LABELS[status]

  if (status === "served") {
    return <span className="status-chip status-chip--served">{label}</span>
  }

  return <span className={`status-chip status-chip--${status}`}>{label}</span>
}
