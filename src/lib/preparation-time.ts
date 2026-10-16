export type PreparationTimeUnit = "minutes" | "hours"
export const PREPARATION_TIME_ERROR =
  "Enter 0–1440 whole minutes, or up to 24 hours (for example, 1.5). Leave blank if unknown."

/** null means unspecified; undefined means invalid. Persist only whole minutes. */
export function parsePreparationTime(
  value: string,
  unit: string
): number | null | undefined {
  if (unit !== "minutes" && unit !== "hours") return undefined
  const text = value.trim()
  if (!text) return null
  if (!/^\d+(?:\.\d+)?$/.test(text)) return undefined
  const minutes = Number(text) * (unit === "hours" ? 60 : 1)
  const rounded = Math.round(minutes)
  if (
    !Number.isFinite(minutes) ||
    Math.abs(minutes - rounded) >
      Number.EPSILON * Math.max(1, Math.abs(minutes)) * 4 ||
    rounded < 0 ||
    minutes > 1440
  )
    return undefined
  return rounded
}

export function preparationTimeFields(minutes: number | null | undefined) {
  const hours = minutes != null && minutes > 0 && minutes % 60 === 0
  return {
    preparationTime:
      minutes == null ? "" : String(hours ? minutes / 60 : minutes),
    preparationTimeUnit: hours ? "hours" : "minutes",
  }
}

export function formatPreparationTime(minutes: number | null | undefined) {
  if (minutes == null) return null
  if (minutes === 0) return "Ready to serve"
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return [hours ? `${hours} hr` : "", remainder ? `${remainder} min` : ""]
    .filter(Boolean)
    .join(" ")
}
