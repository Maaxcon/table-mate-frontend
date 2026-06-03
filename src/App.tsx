import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { GoogleOAuthProvider } from "@react-oauth/google"
import AuthInitializer from "@/components/AuthInitializer"
import { ThemeProvider } from "@/context/ThemeContext"
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle"
import CabinetPage from "@/pages/CabinetPage"
import GreetingPage from "@/pages/GreetingPage"
import MenuPage from "@/pages/MenuPage"
import SelectRestaurantPlaceholderPage from "@/pages/SelectRestaurantPlaceholderPage"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { WaiterOrderPage } from "@/pages/WaiterOrderPage"
import { RestaurantListPage } from "@/pages/RestaurantListPage"
import { ReservationPage } from "@/features/reservation/ReservationPage"
import { BookingPage } from "@/pages/BookingPage"
import ProtectedRoute from "@/routes/ProtectedRoute"
import PublicRoute from "@/routes/PublicRoute"
import StaffContextRoute from "@/routes/StaffContextRoute"

const clientId = env.googleClientId !== ENV_NOT_CONFIGURED_VALUE ? env.googleClientId : ""

function ThemedLayout() {
  return (
    <ThemeProvider>
      <ThemeToggle className="theme-toggle--global" />
      <Outlet />
    </ThemeProvider>
  )
}

function App() {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthInitializer>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/" element={<GreetingPage />} />
            </Route>
            <Route element={<ThemedLayout />}>
              <Route path="/restaurants" element={<RestaurantListPage />} />
              <Route path="/waiter-order" element={<WaiterOrderPage />} />
              <Route
                path="/menu/:restaurantId"
                element={
                  <ErrorBoundary>
                    <MenuPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/:public_restaurant_id/book"
                element={
                  <ErrorBoundary>
                    <BookingPage />
                  </ErrorBoundary>
                }
              />
              <Route element={<StaffContextRoute />}>
                <Route path="/select-restaurant" element={<SelectRestaurantPlaceholderPage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route path="/cabinet" element={<CabinetPage />} />
                <Route path="/reservations" element={<ReservationPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthInitializer>
    </GoogleOAuthProvider>
  )
}

export default App
