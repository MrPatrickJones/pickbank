export type Locale = "de" | "en"

export type Bilingual = { de: string; en: string }

export const pick = (value: Bilingual, locale: Locale) => value[locale] ?? value.de

export type StatusTone = "good" | "info" | "warning" | "critical" | "neutral"

/** Deterministic formatting – Intl output can differ between server and client. */
export function formatEuro(value: number, fractionDigits = 2) {
  const fixed = Math.abs(value).toFixed(fractionDigits)
  const [whole, fraction] = fixed.split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  const sign = value < 0 ? "-" : ""
  return `${sign}${grouped}${fraction ? `,${fraction}` : ""} €`
}

export function formatPercent(value: number, fractionDigits = 2) {
  return `${value.toFixed(fractionDigits).replace(".", ",")} %`
}

/** Fixed report date – keeps server and client markup identical. */
export const reportDate: Bilingual = { de: "17.09.2026", en: "17 Sep 2026" }

export type Holding = {
  id: string
  bank: string
  product: Bilingual
  /** Deposited capital in euro. */
  amount: number
  /** Nominal interest rate per year in percent. */
  rate: number
  /** Agreed term in months. */
  term: number
  /** Months already elapsed. */
  elapsed: number
  country: Bilingual
  opened: string
  maturity: string
}

export type PortalCustomer = {
  name: string
  initials: string
  customerNo: string
  email: string
  phone: string
  address: Bilingual
  since: Bilingual
  advisor: string
  holdings: Holding[]
}

export const customer: PortalCustomer = {
  name: "Andrea Hoffmann",
  initials: "AH",
  customerNo: "509383412",
  email: "a.hoffmann@example.de",
  phone: "+49 3601 229870",
  address: { de: "Lindenweg 4, 99947 Bad Langensalza", en: "Lindenweg 4, 99947 Bad Langensalza" },
  since: { de: "Kunde seit Januar 2024", en: "Customer since January 2024" },
  advisor: "Sandra Vogt",
  holdings: [
    {
      id: "A-10241",
      bank: "Lidion Bank",
      product: { de: "Festgeld 12 Monate", en: "Fixed deposit 12 months" },
      amount: 60000,
      rate: 3.95,
      term: 12,
      elapsed: 8,
      country: { de: "Malta", en: "Malta" },
      opened: "15.01.2026",
      maturity: "15.01.2027",
    },
    {
      id: "A-10242",
      bank: "Klarna Bank AB",
      product: { de: "Flex-Einlage", en: "Flexible deposit" },
      amount: 68400,
      rate: 3.1,
      term: 6,
      elapsed: 5,
      country: { de: "Schweden", en: "Sweden" },
      opened: "02.04.2026",
      maturity: "02.10.2026",
    },
    {
      id: "A-10243",
      bank: "Banca Progetto",
      product: { de: "Festgeld 24 Monate", en: "Fixed deposit 24 months" },
      amount: 45000,
      rate: 4.2,
      term: 24,
      elapsed: 11,
      country: { de: "Italien", en: "Italy" },
      opened: "10.10.2025",
      maturity: "10.10.2027",
    },
    {
      id: "A-10244",
      bank: "Younited Credit",
      product: { de: "Festgeld 12 Monate", en: "Fixed deposit 12 months" },
      amount: 25000,
      rate: 3.75,
      term: 12,
      elapsed: 12,
      country: { de: "Frankreich", en: "France" },
      opened: "12.09.2025",
      maturity: "12.09.2026",
    },
  ],
}

/** Value of a holding including the interest accrued so far (pro rata temporis). */
export function valueOf(holding: Holding) {
  const months = Math.min(holding.elapsed, holding.term)
  const value = holding.amount * (1 + (holding.rate / 100) * (months / 12))
  return { value, profit: value - holding.amount, months }
}

/** Interest the holding pays out over its full term. */
export function interestAtMaturity(holding: Holding) {
  return holding.amount * (holding.rate / 100) * (holding.term / 12)
}

export function totals(holdings: Holding[] = customer.holdings) {
  const invested = holdings.reduce((sum, holding) => sum + holding.amount, 0)
  const value = holdings.reduce((sum, holding) => sum + valueOf(holding).value, 0)
  const expected = holdings.reduce((sum, holding) => sum + interestAtMaturity(holding), 0)
  const weightedRate =
    invested > 0 ? holdings.reduce((sum, h) => sum + h.rate * h.amount, 0) / invested : 0

  return { invested, value, profit: value - invested, expected, weightedRate, count: holdings.length }
}

export function holdingStatus(holding: Holding): { label: Bilingual; tone: StatusTone } {
  if (holding.elapsed >= holding.term) {
    return { label: { de: "Fällig", en: "Matured" }, tone: "warning" }
  }
  if (holding.term - holding.elapsed <= 1) {
    return { label: { de: "Läuft aus", en: "Maturing" }, tone: "info" }
  }
  return { label: { de: "Aktiv", en: "Active" }, tone: "good" }
}

/** Portfolio value per month, derived from the holdings' accrual. */
export function portfolioSeries() {
  const months = ["Okt", "Nov", "Dez", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep"]
  const maxElapsed = Math.max(...customer.holdings.map((holding) => holding.elapsed))

  return months.map((month, index) => {
    const age = maxElapsed - (months.length - 1 - index)
    const value = customer.holdings.reduce((sum, holding) => {
      const grown = holding.elapsed - (maxElapsed - age)
      if (grown <= 0) return sum
      const running = Math.min(grown, holding.term)
      return sum + holding.amount * (1 + (holding.rate / 100) * (running / 12))
    }, 0)
    return { month, value: Math.round(value) }
  })
}

export type Transaction = {
  id: string
  date: string
  bank: string
  kind: Bilingual
  amount: number
  status: Bilingual
  tone: StatusTone
}

export const transactions: Transaction[] = [
  {
    id: "T-70412",
    date: "01.09.2026",
    bank: "Banca Progetto",
    kind: { de: "Zinsgutschrift", en: "Interest credit" },
    amount: 157.5,
    status: { de: "Gutgeschrieben", en: "Credited" },
    tone: "good",
  },
  {
    id: "T-70398",
    date: "12.09.2026",
    bank: "Younited Credit",
    kind: { de: "Rückzahlung bei Fälligkeit", en: "Repayment at maturity" },
    amount: 25937.5,
    status: { de: "In Auszahlung", en: "Being paid out" },
    tone: "info",
  },
  {
    id: "T-70355",
    date: "01.08.2026",
    bank: "Klarna Bank AB",
    kind: { de: "Zinsgutschrift", en: "Interest credit" },
    amount: 176.7,
    status: { de: "Gutgeschrieben", en: "Credited" },
    tone: "good",
  },
  {
    id: "T-70301",
    date: "15.07.2026",
    bank: "Lidion Bank",
    kind: { de: "Einzahlung", en: "Deposit" },
    amount: 60000,
    status: { de: "Angelegt", en: "Invested" },
    tone: "good",
  },
  {
    id: "T-70288",
    date: "01.07.2026",
    bank: "Banca Progetto",
    kind: { de: "Zinsgutschrift", en: "Interest credit" },
    amount: 157.5,
    status: { de: "Gutgeschrieben", en: "Credited" },
    tone: "good",
  },
]

export type PartnerBank = {
  id: string
  name: string
  country: Bilingual
  rate: number
  term: Bilingual
  guarantee: Bilingual
}

export const partnerBanks: PartnerBank[] = [
  {
    id: "lidion",
    name: "Lidion Bank",
    country: { de: "Malta", en: "Malta" },
    rate: 4.05,
    term: { de: "12 Monate", en: "12 months" },
    guarantee: { de: "Einlagensicherung Malta · bis 100.000 €", en: "Malta deposit guarantee · up to €100,000" },
  },
  {
    id: "progetto",
    name: "Banca Progetto",
    country: { de: "Italien", en: "Italy" },
    rate: 4.2,
    term: { de: "24 Monate", en: "24 months" },
    guarantee: { de: "Einlagensicherung Italien · bis 100.000 €", en: "Italian deposit guarantee · up to €100,000" },
  },
  {
    id: "klarna",
    name: "Klarna Bank AB",
    country: { de: "Schweden", en: "Sweden" },
    rate: 3.25,
    term: { de: "flexibel", en: "flexible" },
    guarantee: { de: "Einlagensicherung Schweden · bis 100.000 €", en: "Swedish deposit guarantee · up to €100,000" },
  },
  {
    id: "younited",
    name: "Younited Credit",
    country: { de: "Frankreich", en: "France" },
    rate: 3.8,
    term: { de: "12 Monate", en: "12 months" },
    guarantee: { de: "Einlagensicherung Frankreich · bis 100.000 €", en: "French deposit guarantee · up to €100,000" },
  },
]

export type PortalDocument = {
  id: string
  title: Bilingual
  detail: Bilingual
  date: string
}

export const documents: PortalDocument[] = [
  {
    id: "D-2026-09",
    title: { de: "Portfolio-Report September 2026", en: "Portfolio report September 2026" },
    detail: { de: "Bestand, Zinserträge und Fälligkeiten", en: "Holdings, interest income and maturities" },
    date: "01.09.2026",
  },
  {
    id: "D-2026-ST",
    title: { de: "Jahressteuerbescheinigung 2025", en: "Annual tax certificate 2025" },
    detail: { de: "Für Ihre Einkommensteuererklärung", en: "For your income tax return" },
    date: "28.02.2026",
  },
  {
    id: "D-10243",
    title: { de: "Vertrag Banca Progetto · Festgeld 24 M.", en: "Contract Banca Progetto · 24-month deposit" },
    detail: { de: "Unterzeichnet am 10.10.2025", en: "Signed on 10 Oct 2025" },
    date: "10.10.2025",
  },
  {
    id: "D-10241",
    title: { de: "Vertrag Lidion Bank · Festgeld 12 M.", en: "Contract Lidion Bank · 12-month deposit" },
    detail: { de: "Unterzeichnet am 15.01.2026", en: "Signed on 15 Jan 2026" },
    date: "15.01.2026",
  },
]

export type ActivityItem = {
  id: string
  title: Bilingual
  detail: Bilingual
  time: Bilingual
  tone: StatusTone
}

export const activity: ActivityItem[] = [
  {
    id: "A-1",
    title: { de: "Zinsgutschrift eingegangen", en: "Interest credited" },
    detail: { de: "Banca Progetto · 157,50 €", en: "Banca Progetto · €157.50" },
    time: { de: "heute, 07:40", en: "today, 07:40" },
    tone: "good",
  },
  {
    id: "A-2",
    title: { de: "Anlage wird fällig", en: "Deposit is maturing" },
    detail: { de: "Younited Credit · 12.09.2026", en: "Younited Credit · 12 Sep 2026" },
    time: { de: "vor 2 Tagen", en: "2 days ago" },
    tone: "warning",
  },
  {
    id: "A-3",
    title: { de: "Neues Zinsangebot verfügbar", en: "New rate available" },
    detail: { de: "Banca Progetto · 4,20 % · 24 Monate", en: "Banca Progetto · 4.20% · 24 months" },
    time: { de: "vor 4 Tagen", en: "4 days ago" },
    tone: "info",
  },
  {
    id: "A-4",
    title: { de: "Portfolio-Report bereitgestellt", en: "Portfolio report published" },
    detail: { de: "September 2026 · PDF", en: "September 2026 · PDF" },
    time: { de: "01.09.2026", en: "1 Sep 2026" },
    tone: "neutral",
  },
]

export type NotificationItem = { id: string; title: Bilingual; time: Bilingual }

export const notifications: NotificationItem[] = [
  {
    id: "N-1",
    title: { de: "Younited Credit wird am 12.09. fällig – Wiederanlage wählen", en: "Younited Credit matures on 12 Sep – choose a reinvestment" },
    time: { de: "vor 2 Tagen", en: "2 days ago" },
  },
  {
    id: "N-2",
    title: { de: "Zinsgutschrift von Banca Progetto eingegangen", en: "Interest credit from Banca Progetto received" },
    time: { de: "heute, 07:40", en: "today, 07:40" },
  },
  {
    id: "N-3",
    title: { de: "Jahressteuerbescheinigung 2025 steht bereit", en: "Annual tax certificate 2025 is available" },
    time: { de: "28.02.2026", en: "28 Feb 2026" },
  },
]
