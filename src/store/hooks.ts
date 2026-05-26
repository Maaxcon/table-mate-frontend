import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch, RootState } from "."

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector)
