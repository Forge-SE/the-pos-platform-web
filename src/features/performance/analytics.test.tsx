// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { AnalyticsCards } from "./analytics"
import type { OperationsSummary, SalesToday } from "./model"
import { groupTrend, heatmapCounts, LineChart } from "./charts"

afterEach(cleanup)
const sales: SalesToday = {
  totalSales: -1000,
  grossSales: 10000,
  netRevenue: -1000,
  totalCollected: -1000,
  discounts: 0,
  discountCount: 0,
  comps: 0,
  tips: 0,
  taxCollected: 0,
  refundsTotal: 11000,
  refundedSales: 11000,
  orderCount: 1,
  voidCount: 0,
  voidAmount: 0,
  historicalOrderCount: 0,
  taxBreakdown: [],
  paymentBreakdown: [],
}
const operations: OperationsSummary = {
  topItems: [
    { name: "Actual saved meal", quantity: 2, revenue: 10000, orderCount: 1 },
  ],
  categories: [{ name: "Mains", quantity: 2, revenue: 10000, orderCount: 1 }],
  diningTypes: [{ label: "TAKEAWAY", count: 1, amount: 10000 }],
  staff: [
    {
      id: "staff",
      name: "Actual staff member",
      orderCount: 1,
      grossSales: 10000,
      discounts: 0,
      discountCount: 0,
    },
  ],
  shiftsClosed: [],
  trend: [{ date: "2026-10-10", netRevenue: -1000, orderCount: 1 }],
  peakHours: Array.from({ length: 168 }, (_, i) => ({
    weekday: Math.floor(i / 24) + 1,
    hour: i % 24,
    orderCount: i === 12 ? 1 : 0,
  })),
  customers: {
    identifiedOrders: 0,
    totalOrders: 1,
    uniqueCustomers: 0,
    repeatCustomers: 0,
    repeatRate: 0,
  },
}
describe("live analytics cards", () => {
  it("keeps the preview curve and functional day/week/month controls with real totals", () => {
    const trend = [
      { date: "2026-10-01", netRevenue: 500, orderCount: 1 },
      { date: "2026-10-02", netRevenue: -100, orderCount: 0 },
      { date: "2026-10-08", netRevenue: 200, orderCount: 1 },
    ]
    expect(groupTrend(trend, "Week").map((point) => point.value)).toEqual([
      400, 200,
    ])
    expect(groupTrend(trend, "Month").map((point) => point.value)).toEqual([
      600,
    ])
    const { container } = render(
      <AnalyticsCards
        operations={{ ...operations, trend }}
        sales={sales}
        loading={false}
        tab="revenue"
      />
    )
    expect(
      container.querySelector('[data-chart="line"]')?.getAttribute("d")
    ).toContain(" C ")
    fireEvent.click(screen.getByRole("tab", { name: "Day" }))
    expect(
      screen.getByRole("tab", { name: "Day" }).getAttribute("aria-selected")
    ).toBe("true")
    expect(window.location.search).toContain("trendGroup=Day")
    fireEvent.click(screen.getByRole("tab", { name: "Week" }))
  })
  it("preserves all hourly orders in the compact heatmap, including overnight sales", () => {
    const cells = [
      { weekday: 1, hour: 2, orderCount: 3 },
      { weekday: 1, hour: 23, orderCount: 2 },
      { weekday: 1, hour: 9, orderCount: 4 },
    ]
    const counts = heatmapCounts(cells)
    expect(counts[0]).toEqual([4, 0, 0, 0, 5])
    expect(counts.flat().reduce((sum, count) => sum + count, 0)).toBe(9)
  })
  it("restores expected/count/variance tiles and a signed variance curve", () => {
    const shiftsClosed = [0, 1].map((index) => ({
      id: String(index),
      openedAt: "2026-10-09T09:00:00Z",
      closedAt: "2026-10-10T20:00:00Z",
      expectedCash: 10000,
      countedCash: 9500,
      variance: index ? 100 : -500,
      varianceFlagged: false,
      orderCount: 1,
      revenue: 10000,
    }))
    const { container } = render(
      <AnalyticsCards
        operations={{ ...operations, shiftsClosed }}
        sales={sales}
        loading={false}
        tab="revenue"
      />
    )
    expect(screen.getByText("Expected")).toBeTruthy()
    expect(screen.getByText("Counted")).toBeTruthy()
    expect(screen.getByText("Variance")).toBeTruthy()
    expect(
      screen.getByRole("img", { name: "Cash variance history" })
    ).toBeTruthy()
    expect(container.querySelectorAll('[data-chart="line"]')).toHaveLength(2)
  })
  it.each(
    [
      [],
      [{ label: "Only", value: 0 }],
      [{ label: "Refund", value: -100 }],
      [
        { label: "A", value: -100 },
        { label: "B", value: 200 },
      ],
    ].map((points) => ({ points }))
  )(
    "handles sparse or signed chart values without invalid coordinates",
    ({ points }) => {
      const { container } = render(
        <LineChart points={points} label="Test trend" />
      )
      expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
    }
  )
  it("renders saved metrics and customer coverage without sample figures", () => {
    const { container } = render(
      <AnalyticsCards
        operations={operations}
        sales={sales}
        loading={false}
        tab="all"
      />
    )
    expect(screen.getByText("Actual saved meal")).toBeTruthy()
    expect(screen.getByText("Actual staff member")).toBeTruthy()
    expect(screen.getByText(/Coverage: 0 of 1 completed sales/)).toBeTruthy()
    expect(screen.queryByText(/Preview|synthetic|Coming soon/)).toBeNull()
    expect(container.querySelector('[data-zero-line="true"]')).toBeTruthy()
    expect(container.querySelector('[data-chart="line"]')).toBeTruthy()
    expect(container.querySelector("linearGradient")).toBeTruthy()
    expect(
      container.querySelectorAll('[data-heatmap-cell="true"]')
    ).toHaveLength(35)
    expect(container.querySelectorAll("ol")).toHaveLength(2)
    expect(container.querySelector("table")).toBeNull()
    expect(
      screen.getByRole("progressbar", { name: "Customer repeat rate" })
    ).toBeTruthy()
  })
  it("renders a zero-sales period without invalid chart coordinates and respects the selected tab", () => {
    const empty = {
      ...operations,
      trend: [{ date: "2026-10-10", netRevenue: 0, orderCount: 0 }],
      topItems: [],
      staff: [],
      categories: [],
    }
    const { container } = render(
      <AnalyticsCards
        operations={empty}
        sales={{ ...sales, orderCount: 0 }}
        loading={false}
        tab="revenue"
      />
    )
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
    expect(
      screen.queryByRole("heading", { name: "Staff performance" })
    ).toBeNull()
    expect(
      screen.queryByRole("heading", { name: "Customer repeat rate" })
    ).toBeNull()
    expect(screen.getByRole("heading", { name: "Sales trend" })).toBeTruthy()
  })
})
