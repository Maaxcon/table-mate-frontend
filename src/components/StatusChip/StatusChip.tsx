import { useTranslation } from "react-i18next"
import type { OrderItemStatusEnum } from "@/types/api/types.gen"
import "./StatusChip.css"

export type StatusValue = OrderItemStatusEnum

interface StatusChipProps {
  status: StatusValue
}

export function StatusChip({ status }: StatusChipProps) {
  const { t } = useTranslation()
  const label =
    status === "served" ? `${t(`orderStatus.${status}`)} \u2713` : t(`orderStatus.${status}`)

  if (status === "served") {
    return <span className="status-chip status-chip--served">{label}</span>
  }

  return <span className={`status-chip status-chip--${status}`}>{label}</span>
}
