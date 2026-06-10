// Single source of truth for restaurant working-hours types, shared by the
// customer menu and the admin editor.
export type WorkingHoursDay = { open: string; close: string }
export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
export type WorkingHours = Partial<Record<WeekDay, WorkingHoursDay>>
