import { describe, expect, it } from "vitest"
import { zonedWallTimeToUtcIso } from "./utils"

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
})
