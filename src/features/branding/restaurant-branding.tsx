import { useEffect, useRef, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import {
  CheckCircleIcon,
  CreditCardIcon,
  ImageIcon,
  SpinnerGapIcon,
  StorefrontIcon,
  WalletIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import {
  SettingRow,
  SettingsBody,
  SettingsDialog,
  SettingsHeader,
} from "@/components/settings/settings-layout"
import { MomoAccounts } from "@/features/payouts/momo-accounts"
import { PaystackSettings } from "@/features/payouts/paystack-settings"
import { SubscriptionPanel } from "@/features/subscriptions/subscription-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/loading-state"
import { validateImageFile } from "@/features/menu/model"
import { uploadImageToCloudinary } from "@/lib/cloudinary"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { hasPermission } from "@/lib/permissions"

const RESTAURANT_QUERY = gql`
  query RestaurantBranding {
    restaurant {
      id
      name
      slug
      code
      currency
      timezone
      logoUrl
      digestEmail
    }
  }
`

const COMPLETE_LOGO_UPLOAD = gql`
  mutation CompleteRestaurantLogoUpload($objectKey: String!) {
    completeRestaurantLogoUpload(objectKey: $objectKey) {
      id
      logoUrl
    }
  }
`

const UPDATE_DIGEST_EMAIL = gql`
  mutation UpdateDigestEmail($email: String!) {
    updateDigestEmail(email: $email) {
      id
      digestEmail
    }
  }
`

type LogoStatus = "idle" | "uploading" | "verifying" | "done" | "error"
type SettingsSection = "restaurant" | "subscription" | "payouts"

const sections = [
  { id: "restaurant", label: "Restaurant", icon: StorefrontIcon },
  { id: "subscription", label: "Subscription", icon: CreditCardIcon },
  { id: "payouts", label: "Payouts", icon: WalletIcon },
] as const

interface RestaurantData {
  restaurant: {
    id: string
    name: string
    slug: string
    code: string
    currency: string
    timezone: string
    logoUrl: string | null
    digestEmail: string | null
  }
}

export function RestaurantBranding({
  open,
  section,
  onOpenChange,
  onSectionChange,
}: {
  open: boolean
  section: SettingsSection
  onOpenChange: (open: boolean) => void
  onSectionChange: (section: SettingsSection) => void
}) {
  const profile = getAccessTokenProfile()
  const canManage = hasPermission(profile, "SETTINGS_MANAGE")
  const { data, loading, error, refetch } =
    useQuery<RestaurantData>(RESTAURANT_QUERY)
  const [completeUpload] = useMutation(COMPLETE_LOGO_UPLOAD)
  const [status, setStatus] = useState<LogoStatus>("idle")
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadLogo(file: File) {
    try {
      validateImageFile(file)
    } catch (validationError) {
      setStatus("error")
      setMessage(
        validationError instanceof Error
          ? validationError.message
          : "Use JPEG, PNG, or WebP."
      )
      return
    }
    try {
      setStatus("uploading")
      setMessage(null)
      const secureUrl = await uploadImageToCloudinary(file)
      setStatus("verifying")
      await completeUpload({
        variables: { objectKey: secureUrl },
      })
      await refetch()
      setStatus("done")
    } catch (uploadError) {
      setStatus("error")
      setMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload logo."
      )
    }
  }

  const restaurant = data?.restaurant
  const [digestEmail, setDigestEmail] = useState("")
  const [digestNote, setDigestNote] = useState<string | null>(null)
  const [saveDigest, { loading: savingDigest }] =
    useMutation(UPDATE_DIGEST_EMAIL)
  useEffect(() => {
    setDigestEmail(restaurant?.digestEmail ?? "")
  }, [restaurant?.digestEmail])

  const uploading = status === "uploading" || status === "verifying"

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      label="Restaurant settings"
      items={sections}
      section={section}
      onSectionChange={(id) => onSectionChange(id as SettingsSection)}
    >
      {section === "restaurant" && (
        <>
          <SettingsHeader
            title="Restaurant"
            description="The logo appears on receipts, the sign-in screen, and the sidebar."
          />
          <SettingsBody>
            {error ? (
              <div className="py-6 text-sm text-destructive">
                Could not load restaurant details.
                <div className="mt-3">
                  <Button variant="outline" onClick={() => refetch()}>
                    Try again
                  </Button>
                </div>
              </div>
            ) : loading ? (
              <LoadingState className="py-8" label="restaurant" />
            ) : (
              <>
                <SettingRow
                  title="Logo"
                  description="JPEG, PNG, or WebP. Shown wherever the restaurant is identified."
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                      {restaurant?.logoUrl ? (
                        <img
                          src={restaurant.logoUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-5" />
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={!canManage || uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void uploadLogo(file)
                        event.currentTarget.value = ""
                      }}
                    />
                    {canManage ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <SpinnerGapIcon
                            data-icon="inline-start"
                            className="animate-spin"
                          />
                        ) : null}
                        {status === "uploading"
                          ? "Uploading…"
                          : status === "verifying"
                            ? "Verifying…"
                            : "Change"}
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Only managers and owners can change branding.
                      </p>
                    )}
                  </div>
                </SettingRow>
                {status === "done" && (
                  <p className="flex items-center gap-1.5 pb-2 text-xs text-secondary">
                    <CheckCircleIcon className="size-3.5" weight="fill" />
                    Logo verified and live.
                  </p>
                )}
                {status === "error" && message && (
                  <p className="flex items-center gap-1.5 pb-2 text-xs text-destructive">
                    <WarningCircleIcon className="size-3.5" weight="fill" />
                    {message}
                  </p>
                )}
                <SettingRow
                  title="Name"
                  description="The name staff and guests see for this restaurant."
                >
                  <span className="text-sm font-medium">
                    {restaurant?.name ?? "Restaurant"}
                  </span>
                </SettingRow>
                <SettingRow
                  title="Sign-in code"
                  description="Staff enter this code before choosing their name."
                >
                  <span className="text-sm font-medium">
                    {restaurant?.code ?? "—"}
                  </span>
                </SettingRow>
                <SettingRow
                  title="Currency and timezone"
                  description="Prices are stored in pesewas and dated in the restaurant timezone."
                >
                  <span className="text-sm font-medium">
                    {restaurant
                      ? `${restaurant.currency} · ${restaurant.timezone}`
                      : "—"}
                  </span>
                </SettingRow>
                {profile?.role === "OWNER" && (
                  <SettingRow
                    title="Sales digest email"
                    description="Yesterday's rollup is emailed here each morning after 05:15."
                  >
                    <div className="w-full">
                      <form
                        className="flex w-full max-w-sm gap-2"
                        onSubmit={(event) => {
                          event.preventDefault()
                          setDigestNote(null)
                          void saveDigest({ variables: { email: digestEmail } })
                            .then(() => setDigestNote("Digest email saved."))
                            .catch((error: unknown) =>
                              setDigestNote(
                                error instanceof Error
                                  ? error.message
                                  : "Could not save the digest email."
                              )
                            )
                        }}
                      >
                        <Input
                          type="email"
                          required
                          value={digestEmail}
                          onChange={(event) =>
                            setDigestEmail(event.target.value)
                          }
                          placeholder="owner@restaurant.com"
                          aria-label="Sales digest email"
                        />
                        <Button type="submit" disabled={savingDigest}>
                          {savingDigest ? "Saving…" : "Save"}
                        </Button>
                      </form>
                      {digestNote && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {digestNote}
                        </p>
                      )}
                    </div>
                  </SettingRow>
                )}
              </>
            )}
          </SettingsBody>
        </>
      )}
      {section === "subscription" && (
        <>
          <SettingsHeader
            title="Subscription"
            description="Ovaal is billed through Paystack. This is the plan on the restaurant, the last payment, and the next due date."
          />
          <SettingsBody>
            <SubscriptionPanel canManage={canManage} embedded />
          </SettingsBody>
        </>
      )}
      {section === "payouts" && (
        <>
          <SettingsHeader
            title="Payouts"
            description="Mobile money contacts, and the Paystack account MoMo collections settle into."
          />
          <SettingsBody>
            <div className="border-b border-dashed border-border/70 py-6">
              <h3 className="text-sm font-medium">Mobile money contacts</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Saved numbers across MTN, AirtelTigo and Telecel.
              </p>
              <MomoAccounts embedded />
            </div>
            {profile?.role === "OWNER" && (
              <div className="py-6">
                <PaystackSettings embedded />
              </div>
            )}
          </SettingsBody>
        </>
      )}
    </SettingsDialog>
  )
}
