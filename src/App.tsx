import GreetingPage from "@/pages/GreetingPage"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { GoogleOAuthProvider } from "@react-oauth/google"

const googleClientId = env.googleClientId !== ENV_NOT_CONFIGURED_VALUE ? env.googleClientId : null

function App() {
  if (!googleClientId) {
    return <GreetingPage />
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <GreetingPage />
    </GoogleOAuthProvider>
  )
}

export default App
