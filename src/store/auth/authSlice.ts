import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { UserRole } from "@/features/auth/types"

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
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
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
    },
    clearAuth(state) {
      state.accessToken = null
      state.user = null
    },
  },
})

export const { setAccessToken, setUser, clearAuth } = authSlice.actions
export type { AuthUser }
export default authSlice.reducer
