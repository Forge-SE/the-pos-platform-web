/** Normalize a Ghana mobile number to local form `0XXXXXXXXX`. */
export function normalizeGhanaPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "")
  let local = digits
  if (local.startsWith("233") && local.length === 12) {
    local = local.slice(3)
  }
  if (local.length === 9 && !local.startsWith("0")) local = `0${local}`
  if (!/^0\d{9}$/.test(local)) return null
  return local
}

export function formatGhanaPhone(phone: string) {
  if (!/^0\d{9}$/.test(phone)) return phone
  return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`
}
