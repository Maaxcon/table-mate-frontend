import { describe, expect, it } from "vitest"
import {
  getDurationError,
  localDateKey,
  maxDurationBeforeClose,
  openingDayOfInstant,
  safeTimeZone,
  slotDateKey,
  timeToMinutes,
  zonedWallTimeToUtcIso,
} from "./utils"

// Europe/Kyiv, 2026: spring-forward is between Mar 28/29 (EET +120 -> EEST
// +180, at 01:00 UTC / 03:00 local), fall-back is between Oct 24/25 (EEST
// +180 -> EET +120, at 01:00 UTC / 04:00 local). Each case below picks a
// wall-clock time whose naive-as-UTC instant falls on the OPPOSITE side of
// the real transition from where the intended local time actually sits — the
// exact condition that made the single-pass version pick the wrong offset.
describe("zonedWallTimeToUtcIso", () => {
  it("resolves a slot just before the spring-forward transition using the pre-DST offset", () => {
    // 2026-03-29 01:30 local is still EET (+120) — the transition to EEST
    // doesn't happen until 03:00 local. A single offset lookup at the naive
    // instant (01:30 UTC, which is already past the 01:00 UTC transition
    // moment) would wrongly read +180 and land an hour early.
    const iso = zonedWallTimeToUtcIso("2026-03-29", "01:30", "Europe/Kyiv")
    expect(iso).toBe("2026-03-28T23:30:00.000Z")
  })

  it("resolves a slot just before the fall-back transition using the pre-DST offset", () => {
    // 2026-10-25 02:30 local is still EEST (+180) — the fall-back to EET
    // doesn't happen until 04:00 local. A single offset lookup at the naive
    // instant (02:30 UTC, already past the 01:00 UTC transition moment)
    // would wrongly read +120 and land an hour late.
    const iso = zonedWallTimeToUtcIso("2026-10-25", "02:30", "Europe/Kyiv")
    expect(iso).toBe("2026-10-24T23:30:00.000Z")
  })

  it("resolves an ordinary slot far from any DST transition unchanged", () => {
    const iso = zonedWallTimeToUtcIso("2026-07-08", "19:00", "Europe/Kyiv")
    expect(iso).toBe("2026-07-08T16:00:00.000Z")
  })

  it("resolves the repeated fall-back hour to its FIRST occurrence (fold=0, like the backend)", () => {
    // 2026-10-25 03:30 Kyiv happens twice (clocks fall back 04:00 -> 03:00).
    // Python's naive datetime(..., tzinfo=tz) — what the backend uses — is
    // fold=0 and picks the first pass (EEST +180 -> 00:30Z). Resolving to the
    // second (01:30Z) would make the availability map and the booked instant
    // disagree for that hour.
    const iso = zonedWallTimeToUtcIso("2026-10-25", "03:30", "Europe/Kyiv")
    expect(iso).toBe("2026-10-25T00:30:00.000Z")
  })

  it("resolves a time inside the spring-forward gap with the pre-transition offset (fold=0)", () => {
    // 2026-03-29 03:30 Kyiv does not exist (clocks jump 03:00 -> 04:00).
    // fold=0 maps it via the pre-transition offset (EET +120 -> 01:30Z),
    // matching the backend's resolution of the same impossible wall time.
    const iso = zonedWallTimeToUtcIso("2026-03-29", "03:30", "Europe/Kyiv")
    expect(iso).toBe("2026-03-29T01:30:00.000Z")
  })

  it("does not throw and falls back to UTC for a misconfigured restaurant timezone", () => {
    // Backend's _safe_zoneinfo degrades a bad stored value to UTC; without a
    // matching frontend fallback, Intl throws a RangeError here instead —
    // this must resolve the same UTC instant the backend would.
    const iso = zonedWallTimeToUtcIso("2026-07-08", "19:00", "Not/AZone")
    expect(iso).toBe("2026-07-08T19:00:00.000Z")
  })
})

describe("safeTimeZone", () => {
  it("passes through a valid IANA timezone", () => {
    expect(safeTimeZone("Europe/Kyiv")).toBe("Europe/Kyiv")
  })

  it("falls back to UTC for an invalid timezone string, not null", () => {
    // UTC specifically, not null/browser-local — a misconfigured value must
    // degrade to the same fallback the backend uses (_safe_zoneinfo -> UTC),
    // or the two sides silently disagree on the resulting instant.
    expect(safeTimeZone("Not/AZone")).toBe("UTC")
  })

  it("leaves null/undefined/empty alone (no timezone known yet is a different case)", () => {
    expect(safeTimeZone(null)).toBeNull()
    expect(safeTimeZone(undefined)).toBeNull()
    expect(safeTimeZone("")).toBeNull()
  })
})

// Open 18:00, close 02:00 next day — an overnight window (close <= open).
const OVERNIGHT_DAY = { open: "18:00", close: "02:00" }

describe("getDurationError overnight closing bound", () => {
  it("flags a same-day-start window that runs past the wrapped close", () => {
    // 20:00 + 6h30 = 02:30 next day, 30 min past the 02:00 close.
    const start = timeToMinutes("20:00")
    const error = getDurationError(start, start + 390, OVERNIGHT_DAY, null)
    expect(error).not.toBeNull()
  })

  it("allows a same-day-start window that lands exactly on the wrapped close", () => {
    // 20:00 + 6h = 02:00 next day, exactly at close.
    const start = timeToMinutes("20:00")
    const error = getDurationError(start, start + 360, OVERNIGHT_DAY, null)
    expect(error).toBeNull()
  })

  it("flags an after-midnight-start window that runs past the wrapped close", () => {
    // 01:00 (after-midnight portion, stored as raw 01:00 = 60 minutes) + 90min
    // = 02:30, 30 min past the 02:00 close. Previously this whole branch was
    // skipped for any overnight day, so no error was ever raised here.
    const start = timeToMinutes("01:00")
    const error = getDurationError(start, start + 90, OVERNIGHT_DAY, null)
    expect(error).not.toBeNull()
  })

  it("allows an after-midnight-start window that fits before the wrapped close", () => {
    // 01:00 + 60min = 02:00, exactly at close.
    const start = timeToMinutes("01:00")
    const error = getDurationError(start, start + 60, OVERNIGHT_DAY, null)
    expect(error).toBeNull()
  })
})

describe("maxDurationBeforeClose", () => {
  it("caps a late slot on a regular day to the time left before close", () => {
    expect(maxDurationBeforeClose("20:30", { open: "09:00", close: "22:00" })).toBe(90)
  })

  it("caps a pre-midnight slot on an overnight day against the wrapped close", () => {
    // 23:30 with an 02:00 close: 150 minutes remain on the extended timeline.
    expect(maxDurationBeforeClose("23:30", OVERNIGHT_DAY)).toBe(150)
  })

  it("caps an after-midnight slot on an overnight day", () => {
    // 01:00 with an 02:00 close: only 60 minutes remain — the default 120
    // must shrink here instead of tripping a validation error.
    expect(maxDurationBeforeClose("01:00", OVERNIGHT_DAY)).toBe(60)
  })

  it("returns Infinity when there is no day config to cap against", () => {
    expect(maxDurationBeforeClose("20:30", undefined)).toBe(Infinity)
    expect(maxDurationBeforeClose(null, OVERNIGHT_DAY)).toBe(Infinity)
  })
})

// 2026-07-10 is a Friday; Kyiv is UTC+3 in July.
const OVERNIGHT_HOURS = {
  fri: OVERNIGHT_DAY,
  thu: { open: "09:00", close: "22:00" },
}

describe("openingDayOfInstant", () => {
  it("maps a post-midnight instant on an overnight day to the previous (opening) day", () => {
    // 2026-07-10T22:00Z = Sat 2026-07-11 01:00 Kyiv — inside Friday's
    // 18:00–02:00 session, so its opening day is Friday the 10th.
    const day = openingDayOfInstant("2026-07-10T22:00:00Z", "Europe/Kyiv", OVERNIGHT_HOURS)
    expect(localDateKey(day)).toBe("2026-07-10")
  })

  it("keeps an ordinary evening instant on its own venue day", () => {
    // 19:00 Kyiv on Friday — Thursday's config is not overnight, no step back.
    const day = openingDayOfInstant("2026-07-10T16:00:00Z", "Europe/Kyiv", OVERNIGHT_HOURS)
    expect(localDateKey(day)).toBe("2026-07-10")
  })

  it("falls back to the instant's venue day when working hours are unknown", () => {
    const day = openingDayOfInstant("2026-07-10T22:00:00Z", "Europe/Kyiv", null)
    expect(localDateKey(day)).toBe("2026-07-11")
  })

  it("round-trips through slotDateKey back to the original instant (no +24h drift)", () => {
    // The reschedule no-op case: read a stored post-midnight start, key it by
    // its opening day, then let slotDateKey advance it once — re-deriving the
    // instant must give back exactly what was stored, not a day later.
    const storedStart = "2026-07-10T22:00:00.000Z"
    const openingDay = openingDayOfInstant(storedStart, "Europe/Kyiv", OVERNIGHT_HOURS)
    const key = slotDateKey(openingDay, "01:00", OVERNIGHT_HOURS.fri)
    expect(key).toBe("2026-07-11")
    expect(zonedWallTimeToUtcIso(key, "01:00", "Europe/Kyiv")).toBe(storedStart)
  })
})
