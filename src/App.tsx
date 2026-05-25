import { BrowserRouter, Route, Routes } from "react-router-dom"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { GoogleOAuthProvider } from "@react-oauth/google"
import AuthInitializer from "@/components/AuthInitializer"
import GreetingPage from "@/pages/GreetingPage"
import HomePlaceholderPage from "@/pages/HomePlaceholderPage"
import ProtectedRoute from "@/routes/ProtectedRoute"
import PublicRoute from "@/routes/PublicRoute"

const clientId = env.googleClientId !== ENV_NOT_CONFIGURED_VALUE ? env.googleClientId : ""

function App() {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthInitializer>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/" element={<GreetingPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<HomePlaceholderPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthInitializer>
    </GoogleOAuthProvider>
  )
}

export default App
