import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation } from "@apollo/client/react"
import {
  CaretLeftIcon,
  PlusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
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

  const [groupName, setGroupName] = useState("")
  const [minimum, setMinimum] = useState("0")
  const [maximum, setMaximum] = useState("1")
  const [optionGroupId, setOptionGroupId] = useState("")
  const [optionName, setOptionName] = useState("")
  const [optionPrice, setOptionPrice] = useState("0")
  const [attachItemId, setAttachItemId] = useState("")
  const [attachGroupId, setAttachGroupId] = useState("")
  const [optionsError, setOptionsError] = useState<string | null>(null)

  const selectedAttachGroup = groups.find((group) => group.id === attachGroupId)
  const attachGroupReady = Boolean(
    selectedAttachGroup &&
      selectedAttachGroup.options.length >= selectedAttachGroup.maxSelections
  )

  async function submitGroup(event: FormEvent) {
    event.preventDefault()
    const minSelections = Number(minimum)
    const maxSelections = Number(maximum)
    if (
      !groupName.trim() ||
      !Number.isInteger(minSelections) ||
      !Number.isInteger(maxSelections) ||
      minSelections < 0 ||
      maxSelections < 1 ||
      minSelections > maxSelections
    ) {
      setOptionsError(
        "Selection limits must be whole numbers, with minimum at least 0 and no greater than maximum."
      )
      return
    }
    try {
      setOptionsError(null)
      await createGroup({
        variables: {
          input: { name: groupName.trim(), minSelections, maxSelections },
        },
      })
      setGroupName("")
      setMinimum("0")
      setMaximum("1")
      onChanged()
    } catch (mutationError) {
      setOptionsError(
        mutationMessage(mutationError, "Could not create modifier group.")
      )
    }
  }

  async function submitOption(event: FormEvent) {
    event.preventDefault()
    const priceDelta = cedisToPesewas(optionPrice, true)
    if (!optionGroupId || !optionName.trim() || priceDelta === null) {
      setOptionsError(
        "Choose a group, enter an option name, and use a valid positive, zero, or negative price adjustment."
      )
      return
    }
    try {
      setOptionsError(null)
      await createOption({
        variables: {
          input: { groupId: optionGroupId, name: optionName.trim(), priceDelta },
        },
      })
      setOptionName("")
      setOptionPrice("0")
      onChanged()
    } catch (mutationError) {
      setOptionsError(
        mutationMessage(mutationError, "Could not create modifier option.")
      )
    }
  }

  async function submitAttachment(event: FormEvent) {
    event.preventDefault()
    if (!attachItemId || !attachGroupId || !attachGroupReady) {
      setOptionsError(
        "Choose an item and a modifier group with enough options to satisfy its maximum selection limit."
      )
      return
    }
    try {
      setOptionsError(null)
      await attachGroup({
        variables: { menuItemId: attachItemId, modifierGroupId: attachGroupId },
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
          <form
            className="grid gap-4 sm:grid-cols-[1fr_100px_100px_auto]"
            onSubmit={submitGroup}
          >
            <Field><FieldLabel htmlFor="options-group-name">Group name</FieldLabel><Input id="options-group-name" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Size" /></Field>
            <Field><FieldLabel htmlFor="options-group-min">Minimum</FieldLabel><Input id="options-group-min" type="number" min="0" step="1" value={minimum} onChange={(event) => setMinimum(event.target.value)} /></Field>
            <Field><FieldLabel htmlFor="options-group-max">Maximum</FieldLabel><Input id="options-group-max" type="number" min="1" step="1" value={maximum} onChange={(event) => setMaximum(event.target.value)} /></Field>
            <Button type="submit" className="self-end" disabled={groupMutation.loading}><PlusIcon data-icon="inline-start" /> Add</Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Minimum 0 makes a group optional; minimum 1 or more makes it
            required.
          </p>
          <div className="mt-4 space-y-2">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2.5 text-sm">
                <div><p className="font-medium">{group.name}</p><p className="text-xs text-muted-foreground">{group.minSelections === 0 ? "Optional" : `Required · choose at least ${group.minSelections}`} · max {group.maxSelections}</p></div>
                <Badge variant={group.options.length >= group.maxSelections ? "outline" : "destructive"}>{group.options.length} options</Badge>
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
          <form className="space-y-4" onSubmit={submitOption}>
            <Field><FieldLabel>Modifier group</FieldLabel><Select value={optionGroupId} onValueChange={(value) => setOptionGroupId(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Choose group" /></SelectTrigger><SelectContent>{groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent></Select></Field>
            <div className="flex items-end gap-3">
              <Field className="flex-1"><FieldLabel htmlFor="options-option-name">Option name</FieldLabel><Input id="options-option-name" value={optionName} onChange={(event) => setOptionName(event.target.value)} placeholder="Large" /></Field>
              <Field className="max-w-40"><FieldLabel htmlFor="options-option-price">Adjustment (GHS)</FieldLabel><Input id="options-option-price" inputMode="decimal" value={optionPrice} onChange={(event) => setOptionPrice(event.target.value)} placeholder="5.00" /></Field>
              <Button type="submit" disabled={optionMutation.loading || groups.length === 0}><PlusIcon data-icon="inline-start" /> Add</Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Adjustments may add to, subtract from, or leave the item price
            unchanged.
          </p>
          <div className="mt-4 space-y-2">
            {(groups.find((group) => group.id === optionGroupId)?.options ?? []).map((option) => (
              <div key={option.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2.5 text-sm">
                <p className="font-medium">{option.name}</p>
                <Badge variant="outline">
                  {option.priceDelta === 0
                    ? "No change"
                    : `${option.priceDelta > 0 ? "+" : "−"}${formatMoney(Math.abs(option.priceDelta))}`}
                </Badge>
              </div>
            ))}
            {optionGroupId && (groups.find((group) => group.id === optionGroupId)?.options.length ?? 0) === 0 && (
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
            <form
              id="options-assign-form"
              className="space-y-4"
              onSubmit={submitAttachment}
            >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field><FieldLabel>Menu item</FieldLabel><Select value={attachItemId} onValueChange={(value) => setAttachItemId(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Choose item" /></SelectTrigger><SelectContent>{items.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field><FieldLabel>Modifier group</FieldLabel><Select value={attachGroupId} onValueChange={(value) => setAttachGroupId(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Choose group" /></SelectTrigger><SelectContent>{groups.map((group) => <SelectItem key={group.id} value={group.id} disabled={group.options.length < group.maxSelections}>{group.name}{group.options.length < group.maxSelections ? " · add options first" : ""}</SelectItem>)}</SelectContent></Select></Field>
            </div>
              {selectedAttachGroup && !attachGroupReady && <FieldError>Add at least {selectedAttachGroup.maxSelections} options before attaching this group.</FieldError>}
            </form>
          </div>
        )}
    </MenuDialog>
  )
}
