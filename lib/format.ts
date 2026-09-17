/** Deterministic formatting – Intl output can differ between server and client. */

export function formatEuro(value: number, fractionDigits = 2) {
  const fixed = Math.abs(value).toFixed(fractionDigits)
  const [whole, fraction] = fixed.split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${value < 0 ? "-" : ""}${grouped}${fraction ? `,${fraction}` : ""} €`
}

export function formatNumber(value: number, fractionDigits = 0) {
  const fixed = Math.abs(value).toFixed(fractionDigits)
  const [whole, fraction] = fixed.split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${value < 0 ? "-" : ""}${grouped}${fraction ? `,${fraction}` : ""}`
}

export function formatPercent(value: number, fractionDigits = 2) {
  return `${value.toFixed(fractionDigits).replace(".", ",")} %`
}

/** ISO date (YYYY-MM-DD) → 17.09.2026 */
export function formatDate(iso: string) {
  if (!iso) return "–"
  const [year, month, day] = iso.slice(0, 10).split("-")
  if (!year || !month || !day) return iso
  return `${day}.${month}.${year}`
}

/** ISO timestamp → 17.09.2026 · 14:32 */
export function formatDateTime(iso: string) {
  if (!iso) return "–"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} · ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`
}

export function formatFileSize(sizeKb: number) {
  if (sizeKb >= 1024) return `${(sizeKb / 1024).toFixed(1).replace(".", ",")} MB`
  return `${Math.round(sizeKb)} KB`
}

export function initialsOf(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}
