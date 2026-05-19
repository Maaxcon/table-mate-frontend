import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

type AuthState = {
  accessToken: string | null
}

const initialState: AuthState = {
  accessToken: null,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload
    },
    clearAccessToken(state) {
      state.accessToken = null
    },
  },
})

export const { setAccessToken, clearAccessToken } = authSlice.actions
export default authSlice.reducer
