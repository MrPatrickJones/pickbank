import type { Customer, Investment, InvestmentStatus } from "@/lib/types"

/** Fixed reference date of the prototype – keeps demo figures stable. */
export const TODAY = "2026-09-17"

export function parseISO(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1))
}

export function toISO(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function addMonths(iso: string, months: number) {
  const date = parseISO(iso)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return toISO(date)
}

export function daysBetween(fromISO: string, toISODate: string) {
  const ms = parseISO(toISODate).getTime() - parseISO(fromISO).getTime()
  return Math.round(ms / 86_400_000)
}

export function monthsBetween(fromISO: string, toISODate: string) {
  const from = parseISO(fromISO)
  const to = parseISO(toISODate)
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  if (to.getUTCDate() < from.getUTCDate()) months -= 1
  return months
}

/** Months of the term that have already run, capped at the agreed term. */
export function elapsedMonths(investment: Investment, asOf: string = TODAY) {
  return Math.max(0, Math.min(monthsBetween(investment.startDate, asOf), investment.term))
}

/** Interest accrued so far – pro rata per month of term. */
export function accruedInterest(investment: Investment, asOf: string = TODAY) {
  const months = elapsedMonths(investment, asOf)
  return investment.principal * (investment.interestRate / 100) * (months / 12)
}

/** Interest the investment pays over its full term. */
export function interestAtMaturity(investment: Investment) {
  return investment.principal * (investment.interestRate / 100) * (investment.term / 12)
}

export function currentValue(investment: Investment, asOf: string = TODAY) {
  return investment.principal + accruedInterest(investment, asOf)
}

export function daysToMaturity(investment: Investment, asOf: string = TODAY) {
  return daysBetween(asOf, investment.maturityDate)
}

/** Status derived from the dates – the stored status wins for ended or planned deposits. */
export function effectiveStatus(investment: Investment, asOf: string = TODAY): InvestmentStatus {
  if (investment.status === "beendet" || investment.status === "vorgemerkt") return investment.status
  return daysToMaturity(investment, asOf) <= 0 ? "faellig" : "aktiv"
}

export function isActive(investment: Investment, asOf: string = TODAY) {
  return effectiveStatus(investment, asOf) === "aktiv"
}

export type CustomerTotals = {
  principal: number
  value: number
  interest: number
  expectedInterest: number
  activeCount: number
  averageRate: number
  nextMaturity: string | null
}

export function customerTotals(investments: Investment[], asOf: string = TODAY): CustomerTotals {
  const relevant = investments.filter((investment) => effectiveStatus(investment, asOf) !== "beendet")
  const principal = relevant.reduce((sum, investment) => sum + investment.principal, 0)
  const interest = relevant.reduce((sum, investment) => sum + accruedInterest(investment, asOf), 0)
  const expectedInterest = relevant.reduce((sum, investment) => sum + interestAtMaturity(investment), 0)
  const active = relevant.filter((investment) => isActive(investment, asOf))
  const upcoming = relevant
    .map((investment) => investment.maturityDate)
    .filter((date) => daysBetween(asOf, date) >= 0)
    .sort()

  return {
    principal,
    value: principal + interest,
    interest,
    expectedInterest,
    activeCount: active.length,
    averageRate:
      principal > 0
        ? relevant.reduce((sum, investment) => sum + investment.interestRate * investment.principal, 0) / principal
        : 0,
    nextMaturity: upcoming[0] ?? null,
  }
}

export type PortfolioKpis = {
  customerCount: number
  activeCustomers: number
  activeInvestments: number
  volume: number
  maturingSoon: number
  maturingVolume: number
  openActions: number
  newCustomers: number
}

/** Bank-wide figures for the admin dashboard, all derived from the records. */
export function portfolioKpis(
  customers: Customer[],
  investments: Investment[],
  asOf: string = TODAY,
): PortfolioKpis {
  const live = investments.filter((investment) => effectiveStatus(investment, asOf) !== "beendet")
  const maturing = live.filter((investment) => {
    const days = daysToMaturity(investment, asOf)
    return days >= 0 && days <= 60
  })
  const openActions =
    customers.filter((customer) => customer.status === "pruefung" || customer.status === "ausstehend").length +
    live.filter((investment) => effectiveStatus(investment, asOf) === "faellig").length

  const ninetyDaysAgo = addMonths(asOf, -3)
  const newCustomers = customers.filter((customer) => customer.createdAt.slice(0, 10) >= ninetyDaysAgo).length

  return {
    customerCount: customers.length,
    activeCustomers: customers.filter((customer) => customer.status === "aktiv").length,
    activeInvestments: live.filter((investment) => isActive(investment, asOf)).length,
    volume: live.reduce((sum, investment) => sum + investment.principal, 0),
    maturingSoon: maturing.length,
    maturingVolume: maturing.reduce((sum, investment) => sum + investment.principal, 0),
    openActions,
    newCustomers,
  }
}
