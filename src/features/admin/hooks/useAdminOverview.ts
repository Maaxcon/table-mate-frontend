import { fetchOverview, type AdminOverview } from "@/features/admin/api/overview"
import { useResource } from "./useResource"

type UseAdminOverviewResult = {
  data: AdminOverview | null
  loading: boolean
  error: string | null
}

export function useAdminOverview(): UseAdminOverviewResult {
  const { data, loading, error } = useResource<AdminOverview>(fetchOverview, {
    errorMessage: "Could not load the overview.",
  })
  return { data, loading, error }
}
