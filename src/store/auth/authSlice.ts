import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

type AuthUser = {
  email: string
  firstName: string
  lastName: string
  role: string
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
