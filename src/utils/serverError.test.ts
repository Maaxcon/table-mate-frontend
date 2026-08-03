import { describe, expect, it } from "vitest"
import i18n from "@/i18n/config"
import { serverErrorMessage } from "./serverError"

const FALLBACK = "generic-fallback"

describe("serverErrorMessage", () => {
  it("translates a known backend error code", () => {
    const err = Object.assign(
      new Error("Pre-order is only available before the reservation starts."),
      {
        code: "preorder_not_allowed",
      },
    )

    const message = serverErrorMessage(err, FALLBACK)

    expect(message).toBe(i18n.t("errors.server.preorder_not_allowed"))
    // The point of the exercise: the English `detail` must not reach the UI.
    expect(message).not.toBe(err.message)
    expect(message).not.toBe(FALLBACK)
  })

  it("falls back rather than showing raw server text for an unmapped code", () => {
    const err = Object.assign(new Error("Some new English message"), { code: "brand_new_code" })

    expect(serverErrorMessage(err, FALLBACK)).toBe(FALLBACK)
  })

  it("falls back when the error carries no code at all", () => {
    expect(serverErrorMessage(new Error("Internal Server Error"), FALLBACK)).toBe(FALLBACK)
    expect(serverErrorMessage("not an error", FALLBACK)).toBe(FALLBACK)
  })

  it("has a string for every code the two locales agree on", () => {
    const en = i18n.getResourceBundle("en", "translation")?.errors?.server ?? {}
    const uk = i18n.getResourceBundle("uk", "translation")?.errors?.server ?? {}

    expect(Object.keys(en).length).toBeGreaterThan(0)
    expect(Object.keys(uk).sort()).toEqual(Object.keys(en).sort())
  })
})
