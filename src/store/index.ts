import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./auth/authSlice"
import { sessionFlagListener } from "./auth/sessionFlagListener"

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(sessionFlagListener.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
