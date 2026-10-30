// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { ShiftPayments } from "./shift-payments"
import type { ClosureCheck, UnpaidShiftOrder } from "./shift-payments"

const actions = vi.hoisted(() => ({
  record: vi.fn(),
  verify: vi.fn(),
  toast: vi.fn(),
}))
vi.mock("@apollo/client/react", () => ({
  useMutation: (document: {
    definitions: Array<{ name?: { value: string } }>
  }) => [
    document.definitions[0].name?.value === "RecordReceivedShiftPayment"
      ? actions.record
      : actions.verify,
    { loading: false },
  ],
}))
vi.mock("@/components/ui/toaster", () => ({ toast: actions.toast }))
vi.mock("@/features/orders/receipt-dialog", () => ({
  ReceiptDialog: () => null,
}))
vi.mock("@/features/pricing/modals/pricing-dialog", () => ({
  PricingDialog: ({
    children,
    title,
  }: {
    children: React.ReactNode
    title: string
  }) => (
    <div role="dialog" aria-label={title}>
      {children}
    </div>
  ),
}))

const order: UnpaidShiftOrder = {
  id: "order-123456",
  ticketNumber: "T0001",
  total: 12500,
  createdAt: "2026-10-07T12:00:00Z",
  status: "COMPLETED",
  diningType: "TAKEAWAY",
  momoAttempt: null,
}
const check = (orders = [order]): ClosureCheck => ({
  shiftId: "shift-1",
  activeOrderCount: 0,
  unpaidOrders: orders,
})
const refresh = vi.fn().mockResolvedValue({})
function mount(data = check(), canRecord = true) {
  return render(
    <ShiftPayments
      check={data}
      loading={false}
      error={false}
      canRecord={canRecord}
      onRefresh={refresh}
    />
  )
}
beforeEach(() => {
  window.history.replaceState(null, "", "/shift")
  vi.clearAllMocks()
  actions.record.mockReset().mockResolvedValue({
    data: { recordReceivedPayment: { receiptDeliveryStatus: "QUEUED" } },
  })
  actions.verify.mockReset().mockResolvedValue({
    data: {
      verifyMomoPayment: {
        status: "PENDING",
        failureReason: null,
        displayText: "Awaiting approval",
        receiptDeliveryStatus: "NOT_REQUESTED",
      },
    },
  })
})
afterEach(cleanup)

describe("shift payment recovery", () => {
  it("requires confirmation and records the existing order without creating a charge", async () => {
    mount()
    fireEvent.click(
      screen.getByRole("button", { name: "Record received payment" })
    )
    expect(window.location.search).toContain("reconcileOrder=order-123456")
    const submit = screen.getByRole("button", {
      name: "Confirm received payment",
    })
    expect(submit.hasAttribute("disabled")).toBe(true)
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(submit)
    await waitFor(() => expect(actions.record).toHaveBeenCalledOnce())
    expect(actions.record.mock.calls[0][0]).toMatchObject({
      variables: {
        input: {
          orderId: order.id,
          method: "CASH",
          confirmed: true,
          reference: null,
          idempotencyKey: expect.any(String),
        },
      },
    })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(refresh).toHaveBeenCalled()
    expect(actions.verify).not.toHaveBeenCalled()
  })
  it("requires a bank reference and reuses the same payment identity on retry", async () => {
    actions.record.mockRejectedValueOnce(new Error("Network failure"))
    mount()
    fireEvent.click(
      screen.getByRole("button", { name: "Record received payment" })
    )
    fireEvent.click(screen.getByRole("button", { name: "Bank transfer" }))
    fireEvent.click(screen.getByRole("checkbox"))
    const submit = screen.getByRole("button", {
      name: "Confirm received payment",
    })
    expect(submit.hasAttribute("disabled")).toBe(true)
    fireEvent.change(screen.getByLabelText("Bank transfer reference"), {
      target: { value: " bank-123 " },
    })
    fireEvent.click(submit)
    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined())
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    fireEvent.click(submit)
    await waitFor(() => expect(actions.record).toHaveBeenCalledTimes(2))
    expect(actions.record.mock.calls[0][0]).toEqual(
      actions.record.mock.calls[1][0]
    )
    expect(actions.record.mock.calls[0][0]).toMatchObject({
      variables: { input: { method: "TRANSFER", reference: "bank-123" } },
    })
  })
  it("only verifies the existing MoMo reference, with no manual fallback", async () => {
    mount(
      check([
        {
          ...order,
          momoAttempt: {
            id: "attempt-1",
            reference: "pos-1",
            status: "PENDING",
            amount: order.total,
            providerStatus: null,
            displayText: null,
            failureReason: null,
          },
        },
      ])
    )
    expect(
      screen.queryByRole("button", { name: "Record received payment" })
    ).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Check MoMo payment" }))
    await waitFor(() =>
      expect(actions.verify).toHaveBeenCalledWith({
        variables: { reference: "pos-1" },
      })
    )
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    expect(actions.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "MoMo payment not confirmed" })
    )
    expect(actions.record).not.toHaveBeenCalled()
  })
  it("treats a receipt failure as saved payment and opens independent receipt recovery", async () => {
    actions.record.mockResolvedValue({
      data: { recordReceivedPayment: { receiptDeliveryStatus: "FAILED" } },
    })
    mount()
    fireEvent.click(
      screen.getByRole("button", { name: "Record received payment" })
    )
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm received payment" })
    )
    await waitFor(() =>
      expect(window.location.search).toContain("shiftReceipt=order-123456")
    )
    expect(actions.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Received payment recorded",
        status: "success",
      })
    )
    expect(screen.queryByRole("alert")).toBeNull()
  })
  it("hides recovery controls without payment permission", () => {
    mount(check(), false)
    expect(
      screen.queryByRole("button", { name: "Record received payment" })
    ).toBeNull()
    expect(screen.getByText(/Ask a cashier with payment access/)).toBeDefined()
  })
  it("provides a centered query error and local retry", () => {
    render(
      <ShiftPayments loading={false} error canRecord onRefresh={refresh} />
    )
    expect(screen.getByRole("alert").className).toContain("justify-center")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(refresh).toHaveBeenCalledOnce()
  })
})
