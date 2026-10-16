import { describe, expect, it } from "vitest"
import {
  formatPreparationTime,
  parsePreparationTime,
  preparationTimeFields,
} from "./preparation-time"

describe("meal preparation estimates", () => {
  it.each([
    { value: "20", unit: "minutes", expected: 20 },
    { value: "1.5", unit: "hours", expected: 90 },
    { value: "0.25", unit: "hours", expected: 15 },
    { value: "4.1", unit: "hours", expected: 246 },
    { value: "24", unit: "hours", expected: 1440 },
    { value: "0", unit: "minutes", expected: 0 },
    { value: " ", unit: "hours", expected: null },
  ])("normalizes $value $unit", ({ value, unit, expected }) => {
    expect(parsePreparationTime(value, unit)).toBe(expected)
  })
  it.each([
    { value: "-1", unit: "minutes" },
    { value: "1.5", unit: "minutes" },
    { value: "0.001", unit: "hours" },
    { value: "25", unit: "hours" },
    { value: "1441", unit: "minutes" },
    { value: "NaN", unit: "minutes" },
    { value: "1e2", unit: "minutes" },
    { value: "20", unit: "days" },
    { value: "Infinity", unit: "hours" },
    { value: "0.00000001", unit: "minutes" },
  ])("rejects $value $unit", ({ value, unit }) => {
    expect(parsePreparationTime(value, unit)).toBeUndefined()
  })
  it("formats durations and preserves zero versus unknown", () => {
    expect(formatPreparationTime(90)).toBe("1 hr 30 min")
    expect(formatPreparationTime(120)).toBe("2 hr")
    expect(formatPreparationTime(15)).toBe("15 min")
    expect(formatPreparationTime(0)).toBe("Ready to serve")
    expect(formatPreparationTime(null)).toBeNull()
    expect(preparationTimeFields(null)).toEqual({
      preparationTime: "",
      preparationTimeUnit: "minutes",
    })
    expect(preparationTimeFields(120)).toEqual({
      preparationTime: "2",
      preparationTimeUnit: "hours",
    })
    expect(preparationTimeFields(0).preparationTime).toBe("0")
  })
})
