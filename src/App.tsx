import GreetingPage from "@/pages/GreetingPage"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { GoogleOAuthProvider } from "@react-oauth/google"

function App() {
  const clientId = env.googleClientId === ENV_NOT_CONFIGURED_VALUE ? "" : env.googleClientId

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GreetingPage />
    </GoogleOAuthProvider>
  )
}

export default App
