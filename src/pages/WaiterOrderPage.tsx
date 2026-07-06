import { useAppSelector } from "@/store/hooks"
import { WaiterOrderPage as WaiterOrderFeature } from "@/features/waiter-order-view"

export function WaiterOrderPage() {
  const user = useAppSelector((state) => state.auth.user)

  if (!user) {
    return (
      <main className="waiter-view">
        <p className="waiter-view__message">You must be logged in to access this page.</p>
      </main>
    )
  }

  return <WaiterOrderFeature />
}
