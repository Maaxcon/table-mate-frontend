import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { UserRole } from "@/types/auth"

type AuthUser = {
  email: string
  firstName: string
  lastName: string
  role: UserRole
  restaurantId: string | null
}

type AuthState = {
  accessToken: string | null
  user: AuthUser | null
  staffContextPending: boolean
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  staffContextPending: false,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
      state.staffContextPending = false
    },
    setStaffContextPending(state) {
      state.staffContextPending = true
    },
    clearAuth(state) {
      state.accessToken = null
      state.user = null
      state.staffContextPending = false
    },
  },
})

export const { setAccessToken, setUser, setStaffContextPending, clearAuth } = authSlice.actions
export type { AuthUser }
export default authSlice.reducer
