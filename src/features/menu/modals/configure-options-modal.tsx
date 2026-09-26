import { useState } from "react"
import { useMutation } from "@apollo/client/react"
import * as Yup from "yup"
import {
  CaretLeftIcon,
  PlusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import Form, { fieldError } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUrlState } from "@/lib/url-state"
import {
  ATTACH_MODIFIER_GROUP,
  CREATE_MODIFIER_GROUP,
  CREATE_MODIFIER_OPTION,
  cedisToPesewas,
  formatMoney,
  mutationMessage,
} from "@/features/menu/model"
import type { MenuItem, ModifierGroup } from "@/features/menu/model"

const groupValues = { name: "", minimum: "0", maximum: "1" }
const optionValues = { groupId: "", name: "", price: "0" }
const attachValues = { itemId: "", groupId: "" }

const limitsMessage =
  "Selection limits must be whole numbers, with minimum at least 0 and no greater than maximum."

const groupSchema = Yup.object({
  name: Yup.string().trim().required("Enter a group name."),
  minimum: Yup.string(),
  maximum: Yup.string(),
}).test("limits", limitsMessage, function (value) {
  if (!value?.name?.trim()) return true
  const minimum =
    (value.minimum ?? "").trim() === "" ? 0 : Number(value.minimum)
  const maximum = Number(value.maximum)
  const valid =
    Number.isInteger(minimum) &&
    Number.isInteger(maximum) &&
    minimum >= 0 &&
    maximum >= 1 &&
    minimum <= maximum
  return valid || this.createError({ path: "maximum", message: limitsMessage })
})

const optionSchema = Yup.object({
  groupId: Yup.string().required("Choose a group."),
  name: Yup.string().trim().required("Enter an option name."),
  price: Yup.string().test(
    "delta",
    "Use a valid positive, zero, or negative price adjustment.",
    (value) => cedisToPesewas(value ?? "", true) !== null
  ),
})

const attachSchema = Yup.object({
  itemId: Yup.string().required("Choose an item."),
  groupId: Yup.string().required("Choose a modifier group."),
})

import { MenuDialog } from "./menu-dialog"

type OptionsTab = "groups" | "options" | "assign"

const OPTIONS_TABS: Array<{ id: OptionsTab; label: string; hint: string }> = [
  { id: "groups", label: "Groups", hint: "Create choice groups like Size." },
  { id: "options", label: "Options", hint: "Add the choices inside a group." },
  { id: "assign", label: "Assign", hint: "Attach groups to menu items." },
]

function OptionsTabs({
  tab,
  onChange,
}: {
  tab: OptionsTab
  onChange: (tab: OptionsTab) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Modifier setup sections"
      className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1"
    >
      {OPTIONS_TABS.map((entry) => {
        const selected = entry.id === tab
        return (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(entry.id)}
            className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
              selected
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {entry.label}
          </button>
        )
      })}
    </div>
  )
}

export function ConfigureOptionsModal({
  open,
  onOpenChange,
  onChanged,
  items,
  groups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
  items: MenuItem[]
  groups: ModifierGroup[]
}) {
  const [createGroup, groupMutation] = useMutation(CREATE_MODIFIER_GROUP)
  const [createOption, optionMutation] = useMutation(CREATE_MODIFIER_OPTION)
  const [attachGroup, attachMutation] = useMutation(ATTACH_MODIFIER_GROUP)

  const [optionsParam, setOptionsParam] = useUrlState("options")
  const optionsTab: OptionsTab =
    optionsParam === "options" || optionsParam === "assign"
      ? optionsParam
      : "groups"
  const setOptionsTab = (tab: OptionsTab) => setOptionsParam(tab)

  const [optionGroupId, setOptionGroupId] = useState("")
  const [attachGroupId, setAttachGroupId] = useState("")
  const [optionsError, setOptionsError] = useState<string | null>(null)

  const selectedAttachGroup = groups.find((group) => group.id === attachGroupId)
  const attachGroupReady = Boolean(
    selectedAttachGroup &&
    selectedAttachGroup.options.length >= selectedAttachGroup.maxSelections
  )

  async function submitGroup(
    values: typeof groupValues,
    helpers: { resetForm: () => void }
  ) {
    const minSelections =
      values.minimum.trim() === "" ? 0 : Number(values.minimum)
    const maxSelections = Number(values.maximum)
    try {
      setOptionsError(null)
      await createGroup({
        variables: {
          input: { name: values.name.trim(), minSelections, maxSelections },
        },
      })
      helpers.resetForm()
      onChanged()
    } catch (mutationError) {
      setOptionsError(
        mutationMessage(mutationError, "Could not create modifier group.")
      )
    }
  }

  async function submitOption(
    values: typeof optionValues,
    helpers: { setFieldValue: (field: "name" | "price", value: string) => void }
  ) {
    const priceDelta = cedisToPesewas(values.price, true)
    if (priceDelta === null) return
    try {
      setOptionsError(null)
      await createOption({
        variables: {
          input: {
            groupId: values.groupId,
            name: values.name.trim(),
            priceDelta,
          },
        },
      })
      void helpers.setFieldValue("name", "")
      void helpers.setFieldValue("price", "0")
      onChanged()
    } catch (mutationError) {
      setOptionsError(
        mutationMessage(mutationError, "Could not create modifier option.")
      )
    }
  }

  async function submitAttachment(values: typeof attachValues) {
    const group = groups.find((entry) => entry.id === values.groupId)
    const ready = Boolean(group && group.options.length >= group.maxSelections)
    if (!values.itemId || !values.groupId || !ready) {
      setOptionsError(
        "Choose an item and a modifier group with enough options to satisfy its maximum selection limit."
      )
      return
    }
    try {
      setOptionsError(null)
      await attachGroup({
        variables: {
          menuItemId: values.itemId,
          modifierGroupId: values.groupId,
        },
      })
      onChanged()
    } catch (mutationError) {
      setOptionsError(
        mutationMessage(mutationError, "Could not attach modifier group.")
      )
    }
  }

  return (
    <MenuDialog
      wide
      open={open}
      onOpenChange={(next) => {
        if (!next) setOptionsError(null)
        onOpenChange(next)
      }}
      title="Configure Menu Options"
      description="Groups first, then the choices inside each group, then attach them to dishes."
      footer={
        <>
          {optionsTab === "groups" && groups.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={() => setOptionsTab("options")}>
                Continue to options
              </Button>
            </div>
          )}
          {optionsTab === "options" && (
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setOptionsTab("groups")}>
                <CaretLeftIcon data-icon="inline-start" />
                Back to groups
              </Button>
              <Button
                onClick={() => setOptionsTab("assign")}
                disabled={groups.length === 0}
              >
                Continue to assign
              </Button>
            </div>
          )}
          {optionsTab === "assign" && (
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOptionsTab("options")}
              >
                <CaretLeftIcon data-icon="inline-start" />
                Back to options
              </Button>
              <Button
                type="submit"
                form="options-assign-form"
                disabled={attachMutation.loading || !attachGroupReady}
              >
                Attach group
              </Button>
            </div>
          )}
        </>
      }
    >
      <OptionsTabs
        tab={optionsTab}
        onChange={(tab) => {
          setOptionsTab(tab)
          setOptionsError(null)
        }}
      />
      <p className="mt-3 text-sm text-muted-foreground">
        {OPTIONS_TABS.find((entry) => entry.id === optionsTab)?.hint}
      </p>
      {optionsError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <WarningCircleIcon className="mt-0.5 size-4 shrink-0" weight="fill" />
          {optionsError}
        </div>
      )}

      {optionsTab === "groups" && (
        <div className="mt-6">
          <Form
            className="grid gap-4 sm:grid-cols-[1fr_100px_100px_auto]"
            initialValues={groupValues}
            validationSchema={groupSchema}
            onSubmit={submitGroup}
          >
            {(formik) => {
              const nameError = fieldError(formik, "name")
              const limitError = fieldError(formik, "maximum")
              return (
                <>
                  <Field data-invalid={Boolean(nameError)}>
                    <FieldLabel htmlFor="options-group-name">
                      Group name
                    </FieldLabel>
                    <Input
                      id="options-group-name"
                      name="name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="Size"
                      aria-invalid={Boolean(nameError)}
                    />
                    <FieldError>{nameError}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="options-group-min">Minimum</FieldLabel>
                    <Input
                      id="options-group-min"
                      name="minimum"
                      type="number"
                      min="0"
                      step="1"
                      value={formik.values.minimum}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </Field>
                  <Field data-invalid={Boolean(limitError)}>
                    <FieldLabel htmlFor="options-group-max">Maximum</FieldLabel>
                    <Input
                      id="options-group-max"
                      name="maximum"
                      type="number"
                      min="1"
                      step="1"
                      value={formik.values.maximum}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      aria-invalid={Boolean(limitError)}
                    />
                    <FieldError>{limitError}</FieldError>
                  </Field>
                  <Button
                    type="submit"
                    className="self-end"
                    disabled={groupMutation.loading}
                  >
                    <PlusIcon data-icon="inline-start" /> Add
                  </Button>
                </>
              )
            }}
          </Form>
          <p className="mt-3 text-xs text-muted-foreground">
            Minimum 0 makes a group optional; minimum 1 or more makes it
            required.
          </p>
          <div className="mt-4 space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.minSelections === 0
                      ? "Optional"
                      : `Required · choose at least ${group.minSelections}`}{" "}
                    · max {group.maxSelections}
                  </p>
                </div>
                <Badge
                  variant={
                    group.options.length >= group.maxSelections
                      ? "outline"
                      : "destructive"
                  }
                >
                  {group.options.length} options
                </Badge>
              </div>
            ))}
            {groups.length === 0 && (
              <p className="rounded-lg bg-muted/20 p-4 text-sm text-muted-foreground">
                No groups yet. Create one above, then add its choices under
                Options.
              </p>
            )}
          </div>
        </div>
      )}

      {optionsTab === "options" && (
        <div className="mt-6">
          <Form
            className="space-y-4"
            initialValues={optionValues}
            validationSchema={optionSchema}
            onSubmit={submitOption}
          >
            {(formik) => {
              const groupError = fieldError(formik, "groupId")
              const nameError = fieldError(formik, "name")
              const priceError = fieldError(formik, "price")
              return (
                <>
                  <Field data-invalid={Boolean(groupError)}>
                    <FieldLabel>Modifier group</FieldLabel>
                    <Select
                      value={formik.values.groupId}
                      onValueChange={(value) => {
                        const next = value ?? ""
                        void formik.setFieldValue("groupId", next)
                        setOptionGroupId(next)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError>{groupError}</FieldError>
                  </Field>
                  <div className="flex items-end gap-3">
                    <Field className="flex-1" data-invalid={Boolean(nameError)}>
                      <FieldLabel htmlFor="options-option-name">
                        Option name
                      </FieldLabel>
                      <Input
                        id="options-option-name"
                        name="name"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="Large"
                        aria-invalid={Boolean(nameError)}
                      />
                      <FieldError>{nameError}</FieldError>
                    </Field>
                    <Field
                      className="max-w-40"
                      data-invalid={Boolean(priceError)}
                    >
                      <FieldLabel htmlFor="options-option-price">
                        Adjustment (GHS)
                      </FieldLabel>
                      <Input
                        id="options-option-price"
                        name="price"
                        inputMode="decimal"
                        value={formik.values.price}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="5.00"
                        aria-invalid={Boolean(priceError)}
                      />
                      <FieldError>{priceError}</FieldError>
                    </Field>
                    <Button
                      type="submit"
                      disabled={optionMutation.loading || groups.length === 0}
                    >
                      <PlusIcon data-icon="inline-start" /> Add
                    </Button>
                  </div>
                </>
              )
            }}
          </Form>
          <p className="mt-3 text-xs text-muted-foreground">
            Adjustments may add to, subtract from, or leave the item price
            unchanged.
          </p>
          <div className="mt-4 space-y-2">
            {(
              groups.find((group) => group.id === optionGroupId)?.options ?? []
            ).map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2.5 text-sm"
              >
                <p className="font-medium">{option.name}</p>
                <Badge variant="outline">
                  {option.priceDelta === 0
                    ? "No change"
                    : `${option.priceDelta > 0 ? "+" : "−"}${formatMoney(Math.abs(option.priceDelta))}`}
                </Badge>
              </div>
            ))}
            {optionGroupId &&
              (groups.find((group) => group.id === optionGroupId)?.options
                .length ?? 0) === 0 && (
                <p className="rounded-lg bg-muted/20 p-4 text-sm text-muted-foreground">
                  No choices in this group yet — add the first one above.
                </p>
              )}
            {!optionGroupId && groups.length > 0 && (
              <p className="rounded-lg bg-muted/20 p-4 text-sm text-muted-foreground">
                Choose a group to see its choices.
              </p>
            )}
          </div>
        </div>
      )}

      {optionsTab === "assign" && (
        <div className="mt-6">
          <Form
            id="options-assign-form"
            className="space-y-4"
            initialValues={attachValues}
            validationSchema={attachSchema}
            onSubmit={submitAttachment}
          >
            {(formik) => {
              const itemError = fieldError(formik, "itemId")
              const groupError = fieldError(formik, "groupId")
              return (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field data-invalid={Boolean(itemError)}>
                      <FieldLabel>Menu item</FieldLabel>
                      <Select
                        value={formik.values.itemId}
                        onValueChange={(value) => {
                          void formik.setFieldValue("itemId", value ?? "")
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError>{itemError}</FieldError>
                    </Field>
                    <Field data-invalid={Boolean(groupError)}>
                      <FieldLabel>Modifier group</FieldLabel>
                      <Select
                        value={formik.values.groupId}
                        onValueChange={(value) => {
                          const next = value ?? ""
                          void formik.setFieldValue("groupId", next)
                          setAttachGroupId(next)
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectItem
                              key={group.id}
                              value={group.id}
                              disabled={
                                group.options.length < group.maxSelections
                              }
                            >
                              {group.name}
                              {group.options.length < group.maxSelections
                                ? " · add options first"
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError>{groupError}</FieldError>
                    </Field>
                  </div>
                  {selectedAttachGroup && !attachGroupReady && (
                    <FieldError>
                      Add at least {selectedAttachGroup.maxSelections} options
                      before attaching this group.
                    </FieldError>
                  )}
                </>
              )
            }}
          </Form>
        </div>
      )}
    </MenuDialog>
  )
}
