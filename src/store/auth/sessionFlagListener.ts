import { createListenerMiddleware } from "@reduxjs/toolkit"
import { clearAuth, setAccessToken } from "@/store/auth/authSlice"
import { clearHadSession, markHadSession } from "@/store/auth/sessionFlag"

// Keeps the "had session" localStorage flag in sync with auth state, off the
// reducer path so reducers stay pure.
export const sessionFlagListener = createListenerMiddleware()

sessionFlagListener.startListening({
  actionCreator: setAccessToken,
  effect: () => {
    markHadSession()
  },
})

sessionFlagListener.startListening({
  actionCreator: clearAuth,
  effect: () => {
    clearHadSession()
  },
})
