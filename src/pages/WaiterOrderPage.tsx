import { ThemeProvider } from "@/context/ThemeContext"
import { WaiterOrderView } from "@/features/waiter-order-view/WaiterOrderView"

export function WaiterOrderPage() {
  return (
    <ThemeProvider>
      <WaiterOrderView />
    </ThemeProvider>
  )
}
