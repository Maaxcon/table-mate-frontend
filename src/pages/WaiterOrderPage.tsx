import { useSearchParams } from "react-router-dom"
import { WaiterOrderView } from "@/features/waiter-order-view/WaiterOrderView"

export function WaiterOrderPage() {
  const [searchParams] = useSearchParams()
  const restaurantId = searchParams.get("restaurant") ?? ""

  if (!restaurantId) {
    return (
      <main className="waiter-view">
        <p className="waiter-view__message">
          No restaurant specified. Use <code>?restaurant=PUBLIC_ID</code>.
        </p>
      </main>
    )
  }

  return <WaiterOrderView restaurantId={restaurantId} />
}
