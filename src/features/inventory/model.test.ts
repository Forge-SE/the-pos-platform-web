import { describe, expect, it } from "vitest"
import { amount, displayQuantity } from "./model"

describe("inventory quantities", () => {
  it.each(["-1", "NaN", "1e3", "1.1234", "", "1000001"])(
    "rejects %s",
    (value) => expect(amount(value)).toBeUndefined()
  )
  it("supports base-unit decimal quantities", () => {
    expect(amount("25.125")).toBe(25.125)
    expect(amount("0")).toBe(0)
    expect(displayQuantity(1250.5, "g")).toBe("1,250.5 g")
  })
})
