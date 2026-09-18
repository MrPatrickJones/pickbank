/** Formatting for the German UI. Amounts arrive as decimal strings from the API. */

export function formatAmount(amount: string | number, currency = "EUR", fractionDigits = 2) {
  const value = typeof amount === "number" ? amount.toFixed(2) : amount
  const [whole = "0", fraction = "00"] = String(value).replace("-", "").split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  const sign = String(value).startsWith("-") ? "-" : ""
  const symbol = { EUR: "€", CHF: "CHF", USD: "$", GBP: "£" }[currency] ?? currency
  const decimals = fractionDigits === 0 ? "" : `,${fraction.padEnd(2, "0").slice(0, 2)}`
  return `${sign}${grouped}${decimals} ${symbol}`
}

export function formatPercent(rate: string | number, fractionDigits = 2) {
  const value = typeof rate === "number" ? rate : Number(rate)
  if (!Number.isFinite(value)) return "–"
  return `${value.toFixed(fractionDigits).replace(".", ",")} %`
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "–"
  const [year, month, day] = iso.slice(0, 10).split("-")
  if (!year || !month || !day) return iso
  return `${day}.${month}.${year}`
}

export function formatDateTime(iso: string | null | undefined) {
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

export function daysUntil(iso: string) {
  const target = new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime()
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime()
  return Math.round((target - today) / 86_400_000)
}

/** "100.000,00" or "100000" → "100000.00" for the API. */
export function parseAmountInput(input: string) {
  const cleaned = input.trim().replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")
  return cleaned
}
