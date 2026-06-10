import { useAppSelector } from "@/store/hooks"
import { WaiterOrderView } from "@/features/waiter-order-view/WaiterOrderView"

export function WaiterOrderPage() {
  const user = useAppSelector((state) => state.auth.user)

  if (!user) {
    return (
      <main className="waiter-view">
        <p className="waiter-view__message">You must be logged in to access this page.</p>
      </main>
    )
  }

  return <WaiterOrderView />
}
