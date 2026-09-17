"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { formatEuro, portfolioSeries } from "@/lib/portfolio"

const BRAND = "#326BFF"

type TooltipPayloadItem = { value?: number | string }

function ChartTooltip({
  active,
  payload,
  label,
  seriesLabel,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string | number
  seriesLabel: string
}) {
  if (!active || !payload?.length) return null
  const value = Number(payload[0]?.value ?? 0)

  return (
    <div className="rounded-xl border border-[#E7EBF7] bg-white px-3 py-2 shadow-lg">
      <div className="text-xs font-semibold text-[#001855]">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-[#506392]">
        <span className="h-2 w-2 rounded-full" style={{ background: BRAND }} />
        {seriesLabel}
        <span className="ml-auto font-semibold text-[#001855]">{formatEuro(value, 0)}</span>
      </div>
    </div>
  )
}

/** One series, so the card title names it and no legend box is needed. */
export function PortfolioChart({ seriesLabel }: { seriesLabel: string }) {
  const data = portfolioSeries()
  const max = Math.max(...data.map((point) => point.value))
  // Deposits build the portfolio up over the year, so the axis starts at zero
  // and the top is rounded to a full 50k step for readable ticks.
  const top = Math.ceil((max * 1.08) / 50000) * 50000
  const ticks = Array.from({ length: top / 50000 + 1 }, (_, index) => index * 50000)

  return (
    <div className="h-[260px] w-full px-2 pb-4 pt-5">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="ptbFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EDF0FA" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#93A1C9", fontSize: 12 }} dy={6} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#93A1C9", fontSize: 12 }}
            width={62}
            domain={[0, top]}
            ticks={ticks}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}k €`}
          />
          <Tooltip
            content={<ChartTooltip seriesLabel={seriesLabel} />}
            cursor={{ stroke: "#C7D2F0", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={seriesLabel}
            stroke={BRAND}
            strokeWidth={2}
            fill="url(#ptbFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
