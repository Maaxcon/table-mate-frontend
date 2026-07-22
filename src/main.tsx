import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import "@/styles/colors.css"
import "@/styles/reset.css"
import "./index.css"
import "@/i18n/config"
import App from "@/App"
import { store } from "@/store"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
