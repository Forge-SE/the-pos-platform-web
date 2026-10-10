import { useId, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { LoadingState } from "@/components/loading-state"
import { ErrorState } from "@/components/content-state"
import { opsAuthContext } from "@/lib/ops-token"
import { toast } from "@/components/ui/toaster"

export const PAYSTACK_SETTINGS_QUERY = gql`
  query PaystackSettings($restaurantId: ID) {
    paystackSettings(restaurantId: $restaurantId) {
      configured
      mode
      account {
        code
        domain
        businessName
        bankCode
        bankName
        accountLast4
        accountName
        contactEmail
        platformShareBps
        feeBearer
        active
        verified
        syncState
        syncedAt
      }
    }
  }
`
const BANKS = gql`
  query PaystackBanks($restaurantId: ID) {
    paystackBanks(restaurantId: $restaurantId) {
      name
      code
      type
    }
  }
`
const SAVE = gql`
  mutation SavePaystackSubaccount(
    $restaurantId: ID
    $input: SavePaystackSubaccountInput!
  ) {
    savePaystackSubaccount(restaurantId: $restaurantId, input: $input) {
      code
    }
  }
`
const LINK = gql`
  mutation LinkPaystackSubaccount($restaurantId: ID, $code: String!) {
    linkPaystackSubaccount(restaurantId: $restaurantId, code: $code) {
      code
    }
  }
`
const SYNC = gql`
  mutation SyncPaystackSubaccount($restaurantId: ID) {
    syncPaystackSubaccount(restaurantId: $restaurantId) {
      code
    }
  }
`
const ACTIVE = gql`
  mutation SetPaystackSubaccountActive($restaurantId: ID, $active: Boolean!) {
    setPaystackSubaccountActive(restaurantId: $restaurantId, active: $active) {
      code
      active
    }
  }
`

export interface PaystackSettingsData {
  paystackSettings: {
    configured: boolean
    mode: string
    account: {
      code: string | null
      domain: string
      businessName: string
      bankCode: string
      bankName: string | null
      accountLast4: string
      accountName: string | null
      contactEmail: string
      platformShareBps: number
      feeBearer: string
      active: boolean
      verified: boolean
      syncState: string
      syncedAt: string | null
    } | null
  }
}

export function PaystackSettings({ restaurantId }: { restaurantId?: string }) {
  const id = useId()
  const context = restaurantId ? opsAuthContext() : undefined
  const variables = { restaurantId }
  const { data, loading, error, refetch } = useQuery<PaystackSettingsData>(
    PAYSTACK_SETTINGS_QUERY,
    { variables, context, fetchPolicy: "network-only" }
  )
  const settings = data?.paystackSettings
  const account = settings?.account
  const [editing, setEditing] = useState(false)
  const [linking, setLinking] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const {
    data: bankData,
    error: bankError,
    loading: banksLoading,
    refetch: refetchBanks,
  } = useQuery<{
    paystackBanks: Array<{ name: string; code: string; type: string }>
  }>(BANKS, { variables, context, skip: !settings?.configured || !editing })
  const [save] = useMutation(SAVE, { context })
  const [link] = useMutation(LINK, { context })
  const [sync] = useMutation(SYNC, { context })
  const [setActive] = useMutation(ACTIVE, { context })
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
      setEditing(false)
      setLinking(false)
      toast({ title: success, status: "success" })
      await refetch()
    } catch (failure) {
      setActionError(
        failure instanceof Error
          ? failure.message
          : "Could not update the settlement account"
      )
    } finally {
      setBusy(false)
    }
  }
  const recovery =
    account &&
    ["CREATING", "UPDATING", "REVIEW_REQUIRED"].includes(account.syncState)
  const matches = !account || settings.mode === account.domain
  return (
    <section className="content-region mt-6 min-w-0 rounded-xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-[-0.025em]">
          Paystack settlement
        </h2>
        {settings && (
          <Badge variant={settings.mode === "live" ? "secondary" : "outline"}>
            {settings.mode === "live" ? "Live" : "Test mode"}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Route this restaurant’s MoMo collections to its own settlement account.
      </p>
      {loading && !settings ? (
        <LoadingState label="settlement settings" />
      ) : error ? (
        <ErrorState
          title="Could not load settlement settings"
          onRetry={refetch}
        />
      ) : (
        settings && (
          <div className="mt-6 space-y-4">
            {!settings.configured ? (
              <p className="text-sm text-muted-foreground">
                Paystack is not configured. Ask your platform administrator to
                enable payments.
              </p>
            ) : (
              <>
                {settings.mode === "test" && (
                  <p className="text-sm text-muted-foreground">
                    Test payments do not settle real funds.
                  </p>
                )}
                {account ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{account.businessName}</p>
                      <Badge
                        variant={
                          account.active &&
                          account.syncState === "READY" &&
                          matches
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {!matches
                          ? "Environment mismatch"
                          : account.syncState !== "READY"
                            ? "Setup needs attention"
                            : account.active
                              ? "Active"
                              : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      {account.bankName ?? "Settlement destination"} · ending{" "}
                      {account.accountLast4}
                    </p>
                    {account.accountName && (
                      <p className="text-sm text-muted-foreground">
                        {account.accountName}
                      </p>
                    )}
                    <dl className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>
                        <dt>Subaccount</dt>
                        <dd className="font-medium break-all text-foreground">
                          {account.code ?? "Awaiting provider confirmation"}
                        </dd>
                      </div>
                      <div>
                        <dt>Platform share</dt>
                        <dd className="font-medium text-foreground">
                          {account.platformShareBps / 100}%
                        </dd>
                      </div>
                      <div>
                        <dt>Paystack fees paid by</dt>
                        <dd className="font-medium text-foreground">
                          {account.feeBearer === "subaccount"
                            ? "Restaurant"
                            : "Platform"}
                        </dd>
                      </div>
                      <div>
                        <dt>Provider verification</dt>
                        <dd className="font-medium text-foreground">
                          {account.verified ? "Verified" : "Not yet verified"}
                        </dd>
                      </div>
                    </dl>
                    {account.syncedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last refreshed:{" "}
                        {new Date(account.syncedAt).toLocaleString()}
                      </p>
                    )}
                    {recovery && (
                      <p className="text-sm text-destructive">
                        A previous setup was interrupted. Refresh the linked
                        account, or recover it using its Paystack subaccount
                        code.
                      </p>
                    )}
                    {!matches && (
                      <p className="text-sm text-destructive">
                        This account belongs to {account.domain} mode. The
                        server is using {settings.mode} mode; collections are
                        blocked until the environments match.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No settlement account linked. MoMo collection becomes
                    available after setup.
                  </p>
                )}
                {!editing && !linking && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy || !matches || Boolean(recovery)}
                      onClick={() => {
                        setEditing(true)
                        setActionError(null)
                      }}
                    >
                      {account?.code ? "Edit destination" : "Set up settlement"}
                    </Button>
                    {account?.code && (
                      <Button
                        variant="outline"
                        disabled={busy || !matches}
                        onClick={() =>
                          run(
                            () => sync({ variables }),
                            "Settlement details refreshed."
                          )
                        }
                      >
                        Refresh status
                      </Button>
                    )}
                    {account?.code && account.syncState === "READY" && (
                      <Button
                        variant="outline"
                        disabled={busy || !matches}
                        onClick={() =>
                          run(
                            () =>
                              setActive({
                                variables: {
                                  ...variables,
                                  active: !account.active,
                                },
                              }),
                            account.active
                              ? "MoMo collection disabled."
                              : "MoMo collection enabled."
                          )
                        }
                      >
                        {account.active
                          ? "Disable collection"
                          : "Enable collection"}
                      </Button>
                    )}
                    {!account?.code && (
                      <Button
                        variant="outline"
                        disabled={busy || !matches}
                        onClick={() => {
                          setLinking(true)
                          setActionError(null)
                        }}
                      >
                        Link existing subaccount
                      </Button>
                    )}
                  </div>
                )}
                {editing && (
                  <form
                    key={account?.code ?? "new"}
                    className="grid gap-4 sm:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const form = new FormData(event.currentTarget)
                      const input = {
                        businessName: String(form.get("businessName")),
                        bankCode: String(form.get("bankCode")),
                        accountNumber: String(form.get("accountNumber")),
                        contactEmail: String(form.get("contactEmail")),
                        ...(restaurantId
                          ? {
                              platformShareBps: Math.round(
                                Number(form.get("share")) * 100
                              ),
                              feeBearer: String(form.get("bearer")),
                            }
                          : {}),
                      }
                      void run(
                        () => save({ variables: { ...variables, input } }),
                        "Settlement account saved."
                      )
                    }}
                  >
                    <Field>
                      <FieldLabel htmlFor={`${id}-name`}>
                        Business name
                      </FieldLabel>
                      <Input
                        id={`${id}-name`}
                        name="businessName"
                        defaultValue={account?.businessName ?? ""}
                        required
                        minLength={2}
                        maxLength={255}
                        disabled={busy}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${id}-email`}>
                        Settlement contact email
                      </FieldLabel>
                      <Input
                        id={`${id}-email`}
                        name="contactEmail"
                        type="email"
                        defaultValue={account?.contactEmail ?? ""}
                        required
                        disabled={busy}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${id}-bank`}>
                        Bank or mobile money provider
                      </FieldLabel>
                      <select
                        id={`${id}-bank`}
                        name="bankCode"
                        defaultValue={account?.bankCode ?? ""}
                        required
                        disabled={busy || banksLoading || Boolean(bankError)}
                        className="h-10 w-full rounded-md border border-input bg-muted/30 px-3 text-sm focus-visible:outline-ring"
                      >
                        <option value="">
                          Choose a settlement destination
                        </option>
                        {bankData?.paystackBanks.map((bank) => (
                          <option key={bank.code} value={bank.code}>
                            {bank.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${id}-number`}>
                        Account number
                      </FieldLabel>
                      <Input
                        id={`${id}-number`}
                        name="accountNumber"
                        inputMode="numeric"
                        autoComplete="off"
                        pattern="[0-9]{6,20}"
                        required
                        disabled={busy}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the full destination number. Only its last four
                        digits are saved here.
                      </p>
                    </Field>
                    {restaurantId && (
                      <>
                        <Field>
                          <FieldLabel htmlFor={`${id}-share`}>
                            Platform share (%)
                          </FieldLabel>
                          <Input
                            id={`${id}-share`}
                            name="share"
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            defaultValue={
                              (account?.platformShareBps ?? 0) / 100
                            }
                            required
                            disabled={busy}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`${id}-bearer`}>
                            Paystack fee bearer
                          </FieldLabel>
                          <select
                            id={`${id}-bearer`}
                            name="bearer"
                            defaultValue={account?.feeBearer ?? "subaccount"}
                            disabled={busy}
                            className="h-10 rounded-md border border-input bg-muted/30 px-3 text-sm"
                          >
                            <option value="subaccount">Restaurant</option>
                            <option value="account">Platform</option>
                          </select>
                        </Field>
                      </>
                    )}
                    {bankError && (
                      <div className="sm:col-span-2">
                        <ErrorState
                          title="Could not load settlement destinations"
                          onRetry={refetchBanks}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Saving changes the destination for future collections.
                      Check the account number before saving.
                    </p>
                    <div className="flex gap-2 sm:col-span-2">
                      <Button
                        type="submit"
                        disabled={
                          busy ||
                          banksLoading ||
                          !bankData ||
                          Boolean(bankError)
                        }
                      >
                        {busy ? "Saving…" : "Save settlement account"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
                {linking && (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const code = String(
                        new FormData(event.currentTarget).get("code")
                      ).trim()
                      void run(
                        () => link({ variables: { ...variables, code } }),
                        "Subaccount linked."
                      )
                    }}
                  >
                    <Field>
                      <FieldLabel htmlFor={`${id}-code`}>
                        Paystack subaccount code
                      </FieldLabel>
                      <Input
                        id={`${id}-code`}
                        name="code"
                        placeholder="ACCT_…"
                        required
                        pattern="ACCT_[a-zA-Z0-9]+"
                        disabled={busy}
                      />
                    </Field>
                    <p className="text-xs text-muted-foreground">
                      {restaurantId
                        ? "Confirm that this subaccount belongs to this restaurant before linking it."
                        : "The subaccount must already be assigned to this restaurant in Paystack."}
                    </p>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={busy}>
                        {busy ? "Linking…" : "Link subaccount"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setLinking(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
            {busy && (
              <p role="status" className="text-xs text-muted-foreground">
                Updating settlement settings…
              </p>
            )}
            {actionError && (
              <p role="alert" className="text-sm text-destructive">
                {actionError}
              </p>
            )}
          </div>
        )
      )}
    </section>
  )
}
