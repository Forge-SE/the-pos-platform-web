// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { Form, Formik } from "formik"
import * as Yup from "yup"
import {
  PreparationTimeField,
  preparationTimeSchema,
} from "./preparation-time-field"
import { MealPreparationTime } from "@/components/meal-preparation-time"
import { parsePreparationTime } from "@/lib/preparation-time"

afterEach(cleanup)

describe("meal preparation time field", () => {
  it("lets staff switch the entry unit to hours", async () => {
    const save = vi.fn()
    render(
      <Formik
        initialValues={{
          preparationTime: "1.5",
          preparationTimeUnit: "minutes",
        }}
        validationSchema={Yup.object(preparationTimeSchema)}
        onSubmit={(values) =>
          save(
            parsePreparationTime(
              values.preparationTime,
              values.preparationTimeUnit
            )
          )
        }
      >
        <Form>
          <PreparationTimeField />
          <button type="submit">Save</button>
        </Form>
      </Formik>
    )
    fireEvent.click(
      screen.getByRole("combobox", { name: "Preparation time unit" })
    )
    const hours = await screen.findByRole("option", { name: "Hours" })
    fireEvent.pointerDown(hours, { pointerType: "mouse", button: 0 })
    fireEvent.click(hours, { detail: 1 })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(save).toHaveBeenCalledWith(90))
  })
  it("submits a fractional hour estimate as whole minutes", async () => {
    const save = vi.fn()
    render(
      <Formik
        initialValues={{ preparationTime: "", preparationTimeUnit: "hours" }}
        validationSchema={Yup.object(preparationTimeSchema)}
        onSubmit={(values) =>
          save(
            parsePreparationTime(
              values.preparationTime,
              values.preparationTimeUnit
            )
          )
        }
      >
        <Form>
          <PreparationTimeField />
          <button type="submit">Save</button>
        </Form>
      </Formik>
    )
    expect(
      screen.getByRole("combobox", { name: "Preparation time unit" })
    ).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Usual preparation time"), {
      target: { value: "1.5" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(save).toHaveBeenCalledWith(90))
  })
  it("rejects partial minutes and allows clearing an existing estimate", async () => {
    const save = vi.fn()
    render(
      <Formik
        initialValues={{
          preparationTime: "20",
          preparationTimeUnit: "minutes",
        }}
        validationSchema={Yup.object(preparationTimeSchema)}
        onSubmit={(values) =>
          save(
            parsePreparationTime(
              values.preparationTime,
              values.preparationTimeUnit
            )
          )
        }
      >
        <Form>
          <PreparationTimeField />
          <button type="submit">Save</button>
        </Form>
      </Formik>
    )
    const field = screen.getByLabelText("Usual preparation time")
    fireEvent.change(field, { target: { value: "1.5" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("whole minutes")
    )
    expect(save).not.toHaveBeenCalled()
    fireEvent.change(field, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(save).toHaveBeenCalledWith(null))
  })
  it("shows saved estimates and never presents missing values as zero", () => {
    const { rerender } = render(<MealPreparationTime minutes={90} showUnset />)
    expect(screen.getByText("1 hr 30 min").getAttribute("data-slot")).toBe(
      "badge"
    )
    expect(
      screen.getByLabelText("Usual preparation time: 1 hr 30 min")
    ).toBeTruthy()
    expect(screen.queryByText(/Usual prep:/)).toBeNull()
    rerender(<MealPreparationTime minutes={null} showUnset />)
    expect(screen.getByText("Prep time not set")).toBeTruthy()
    rerender(<MealPreparationTime minutes={0} showUnset />)
    expect(screen.getByText("Ready to serve")).toBeTruthy()
  })
})
