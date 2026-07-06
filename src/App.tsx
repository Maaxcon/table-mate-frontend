import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { GoogleOAuthProvider } from "@react-oauth/google"
import AuthInitializer from "@/components/AuthInitializer"
import { ThemeProvider } from "@/context/ThemeContext"
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle"
import CabinetPage from "@/pages/CabinetPage"
import GreetingPage from "@/pages/GreetingPage"
import MenuPage from "@/pages/MenuPage"
import StaffOrdersPage from "@/pages/StaffOrdersPage"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { WaiterOrderPage } from "@/pages/WaiterOrderPage"
import { RestaurantListPage } from "@/pages/RestaurantListPage"
import { BookingPage } from "@/pages/BookingPage"
import AdminLayout from "@/features/admin/AdminLayout"
import OverviewSection from "@/features/admin/pages/OverviewSection"
import RestaurantSection from "@/features/admin/pages/RestaurantSection"
import SettingsSection from "@/features/admin/pages/SettingsSection"
import StaffSection from "@/features/admin/pages/StaffSection"
import MenuSection from "@/features/admin/pages/MenuSection"
import { ReservationScheduler } from "@/features/admin/reservation-scheduler/ReservationScheduler"
import FloorPlanSection from "@/features/editor/FloorPlanSection"
import { KitchenKanban } from "@/features/kitchen-kanban/KitchenKanban"
import { WaiterOrderPage as WaiterOrderFeature } from "@/features/waiter-order-view"
import AdminRoute from "@/routes/AdminRoute"
import ProtectedRoute from "@/routes/ProtectedRoute"
import PublicRoute from "@/routes/PublicRoute"

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
              {/* Public routes */}
              <Route path="/restaurants" element={<RestaurantListPage />} />
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

              {/* Protected staff routes */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "waiter", "cook"]} />}>
                <Route path="/staff/orders" element={<StaffOrdersPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={["admin", "waiter"]} />}>
                <Route path="/waiter-order" element={<WaiterOrderPage />} />
              </Route>

              {/* Protected customer / general routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/cabinet" element={<CabinetPage />} />
              </Route>
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<OverviewSection />} />
                  <Route path="restaurant" element={<RestaurantSection />} />
                  <Route path="settings" element={<SettingsSection />} />
                  <Route path="staff" element={<StaffSection />} />
                  <Route path="menu" element={<MenuSection />} />
                  <Route path="scheduler" element={<ReservationScheduler />} />
                  <Route path="floor-plan/edit" element={<FloorPlanSection />} />
                  <Route path="kitchen" element={<KitchenKanban />} />
                  <Route path="floor" element={<WaiterOrderFeature />} />
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
