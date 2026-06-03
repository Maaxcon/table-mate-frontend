import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { GoogleOAuthProvider } from "@react-oauth/google"
import AuthInitializer from "@/components/AuthInitializer"
import { ThemeProvider } from "@/context/ThemeContext"
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle"
import CabinetPage from "@/pages/CabinetPage"
import GreetingPage from "@/pages/GreetingPage"
import MenuPage from "@/pages/MenuPage"
import SelectRestaurantPage from "@/features/auth/SelectRestaurantPage"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { WaiterOrderPage } from "@/pages/WaiterOrderPage"
import { RestaurantListPage } from "@/pages/RestaurantListPage"
import { BookingPage } from "@/pages/BookingPage"
import AdminLayout from "@/features/admin/AdminLayout"
import RestaurantSection from "@/features/admin/pages/RestaurantSection"
import SettingsSection from "@/features/admin/pages/SettingsSection"
import StaffSection from "@/features/admin/pages/StaffSection"
import MenuSection from "@/features/admin/pages/MenuSection"
import AdminRoute from "@/routes/AdminRoute"
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
                <Route path="/select-restaurant" element={<SelectRestaurantPage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route path="/cabinet" element={<CabinetPage />} />
              </Route>
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="restaurant" replace />} />
                  <Route path="restaurant" element={<RestaurantSection />} />
                  <Route path="settings" element={<SettingsSection />} />
                  <Route path="staff" element={<StaffSection />} />
                  <Route path="menu" element={<MenuSection />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthInitializer>
    </GoogleOAuthProvider>
  )
}

export default App
