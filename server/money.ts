import "server-only"

/**
 * Money never touches a float. Amounts travel as decimal strings ("100000.00")
 * and are calculated in minor units with BigInt.
 */

export type Money = { amount: string; currency: string }

export const SUPPORTED_CURRENCIES = ["EUR", "CHF", "USD", "GBP"] as const
export type Currency = (typeof SUPPORTED_CURRENCIES)[number]

export function toMinorUnits(amount: string): bigint {
  const normalised = amount.trim().replace(/\s/g, "")
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalised)) {
    throw new Error(`Invalid decimal amount: ${amount}`)
  }
  const negative = normalised.startsWith("-")
  const [whole, fraction = ""] = normalised.replace("-", "").split(".")
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))
  return negative ? -cents : cents
}

export function fromMinorUnits(cents: bigint): string {
  const negative = cents < 0n
  const absolute = negative ? -cents : cents
  const whole = absolute / 100n
  const fraction = absolute % 100n
  return `${negative ? "-" : ""}${whole}.${fraction.toString().padStart(2, "0")}`
}

export function addAmounts(amounts: string[]): string {
  return fromMinorUnits(amounts.reduce((sum, amount) => sum + toMinorUnits(amount), 0n))
}

/** Normalises user input ("100.000,00" or "100000") to "100000.00". */
export function parseAmountInput(input: string | number): string {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("Invalid amount")
    return (Math.round(input * 100) / 100).toFixed(2)
  }
  const cleaned = input.trim().replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) throw new Error("Invalid amount")
  return fromMinorUnits(toMinorUnits(cleaned))
}

/** Simple interest over the full term, rounded half-up to the minor unit. */
export function interestAtMaturity(principal: string, interestRate: string, termMonths: number): string {
  const cents = toMinorUnits(principal)
  // rate has four decimals → scale by 10^4, months by 12
  const rateScaled = BigInt(Math.round(Number(interestRate) * 10_000))
  const numerator = cents * rateScaled * BigInt(termMonths)
  const denominator = 100n * 10_000n * 12n
  const rounded = (numerator * 2n + denominator) / (denominator * 2n)
  return fromMinorUnits(rounded)
}

/** Interest accrued between start date and the given day, capped at the term. */
export function accruedInterest(
  principal: string,
  interestRate: string,
  termMonths: number,
  startDate: string,
  asOf: string,
): string {
  const elapsed = Math.max(0, Math.min(monthsBetween(startDate, asOf), termMonths))
  return interestAtMaturity(principal, interestRate, elapsed)
}

export function monthsBetween(fromISO: string, toISO: string) {
  const from = new Date(`${fromISO.slice(0, 10)}T00:00:00Z`)
  const to = new Date(`${toISO.slice(0, 10)}T00:00:00Z`)
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  if (to.getUTCDate() < from.getUTCDate()) months -= 1
  return months
}

/** Maturity date derived from start date and term – the server is the source of truth. */
export function addMonths(startISO: string, months: number) {
  const date = new Date(`${startISO.slice(0, 10)}T00:00:00Z`)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return date.toISOString().slice(0, 10)
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function daysBetween(fromISO: string, toISO: string) {
  const from = new Date(`${fromISO.slice(0, 10)}T00:00:00Z`).getTime()
  const to = new Date(`${toISO.slice(0, 10)}T00:00:00Z`).getTime()
  return Math.round((to - from) / 86_400_000)
}
