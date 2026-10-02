import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { DigitalReceipt } from "./digital-receipt"
import type { ReceiptDetails } from "./digital-receipt"

const details: ReceiptDetails = {
  restaurantName: "Test Kitchen",
  restaurantAddress: "Accra",
  restaurantLogoUrl: null,
  currency: "GHS",
  orderId: "order-123456",
  diningType: "TAKEAWAY",
  deliveryAddress: null,
  createdAt: "2026-09-30T12:00:00Z",
  lines: [
    {
      name: "Jollof",
      quantity: 2,
      unitPrice: 2500,
      lineTotal: 5000,
      notes: "No pepper",
      modifiers: ["Extra meat"],
    },
  ],
  subtotal: 5000,
  discount: 500,
  taxAmount: 0,
  taxes: [],
  tip: 200,
  total: 4700,
  paymentMethod: "MOMO",
  amountPaid: 4700,
}

describe("digital receipt", () => {
  it("renders the saved itemization and monetary values in major currency units", () => {
    const html = renderToStaticMarkup(
      <DigitalReceipt receiptNumber="R-000001" details={details} />
    )
    for (const value of [
      "R-000001",
      "Test Kitchen",
      "Jollof",
      "Extra meat",
      "No pepper",
      "GHS 50.00",
      "−GHS 5.00",
      "GHS 2.00",
      "GHS 47.00",
      "Mobile money",
      "Pickup",
    ])
      expect(html).toContain(value)
  })
  it("does not imply payment when the saved receipt has no payment", () => {
    const html = renderToStaticMarkup(
      <DigitalReceipt
        receiptNumber="R-000002"
        details={{
          ...details,
          paymentMethod: null,
          amountPaid: null,
          discount: 0,
          tip: 0,
        }}
      />
    )
    expect(html).toContain("No payment recorded")
    expect(html).not.toContain("Amount paid")
    expect(html).not.toContain("Kitchen tip")
    expect(html).not.toContain("Discount")
  })
  it("renders the restaurant logo when the receipt carries one", () => {
    const html = renderToStaticMarkup(
      <DigitalReceipt
        receiptNumber="R-000003"
        details={{
          ...details,
          restaurantLogoUrl: "https://example.com/logo.png",
        }}
      />
    )
    expect(html).toContain('src="https://example.com/logo.png"')
  })
})
