import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { GoogleOAuthProvider } from "@react-oauth/google"
import AuthInitializer from "@/components/AuthInitializer"
import { ThemeProvider } from "@/context/ThemeContext"
import GreetingPage from "@/pages/GreetingPage"
import HomePlaceholderPage from "@/pages/HomePlaceholderPage"
import SelectRestaurantPlaceholderPage from "@/pages/SelectRestaurantPlaceholderPage"
import { WaiterOrderPage } from "@/pages/WaiterOrderPage"
import ProtectedRoute from "@/routes/ProtectedRoute"
import PublicRoute from "@/routes/PublicRoute"
import StaffContextRoute from "@/routes/StaffContextRoute"

const clientId = env.googleClientId !== ENV_NOT_CONFIGURED_VALUE ? env.googleClientId : ""

function ThemedLayout() {
  return (
    <ThemeProvider>
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
              <Route path="/waiter-order" element={<WaiterOrderPage />} />
              <Route element={<StaffContextRoute />}>
                <Route path="/select-restaurant" element={<SelectRestaurantPlaceholderPage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route path="/home" element={<HomePlaceholderPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthInitializer>
    </GoogleOAuthProvider>
  )
}

export default App
