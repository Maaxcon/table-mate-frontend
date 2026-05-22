import { createBrowserRouter } from "react-router-dom"
import App from "@/App"
import { WaiterOrderPage } from "@/pages/WaiterOrderPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/waiter-order",
    element: <WaiterOrderPage />,
  },
])
