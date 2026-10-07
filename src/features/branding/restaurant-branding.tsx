import { useRef, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import {
  CheckCircleIcon,
  ImageIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { SectionPage } from "@/components/layout/section-page"
import { MomoAccounts } from "@/features/payouts/momo-accounts"
import { SubscriptionPanel } from "@/features/subscriptions/subscription-panel"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/content-state"
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

type LogoStatus = "idle" | "uploading" | "verifying" | "done" | "error"

interface RestaurantData {
  restaurant: {
    id: string
    name: string
    slug: string
    code: string
    currency: string
    timezone: string
    logoUrl: string | null
  }
}

export function RestaurantBranding() {
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

  return (
    <SectionPage
      title="Settings"
      description="Manage branding, the subscription, and the mobile money numbers that receive payments."
    >
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="content-region rounded-xl border border-border/70 bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-[-0.025em]">
            Restaurant branding
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The logo appears on receipts, the sign-in screen, and the sidebar.
          </p>
          {error ? (
            <ErrorState
              className="mt-6"
              title="Could not load restaurant details."
              onRetry={refetch}
            />
          ) : (
            <div className="mt-6 flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
                {restaurant?.logoUrl ? (
                  <img
                    src={restaurant.logoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {loading ? (
                  <LoadingState
                    className="min-h-20 flex-row gap-2 py-2"
                    label="restaurant"
                  />
                ) : (
                  <p className="truncate text-sm font-semibold">
                    {restaurant?.name ?? "Restaurant"}
                  </p>
                )}
                {restaurant && (
                  <p className="text-xs text-muted-foreground">
                    {restaurant.slug} · {restaurant.code} ·{" "}
                    {restaurant.currency}
                  </p>
                )}
                <div className="mt-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={
                      !canManage ||
                      status === "uploading" ||
                      status === "verifying"
                    }
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void uploadLogo(file)
                      event.currentTarget.value = ""
                    }}
                  />
                  {canManage ? (
                    <Button
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                      disabled={
                        status === "uploading" || status === "verifying"
                      }
                    >
                      {status === "uploading" || status === "verifying" ? (
                        <SpinnerGapIcon
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      ) : (
                        <ImageIcon data-icon="inline-start" />
                      )}
                      {status === "uploading"
                        ? "Uploading…"
                        : status === "verifying"
                          ? "Verifying…"
                          : "Upload logo"}
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Only managers and owners can change branding.
                    </p>
                  )}
                </div>
                {status === "done" && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-secondary">
                    <CheckCircleIcon className="size-3.5" weight="fill" />
                    Logo verified and live.
                  </p>
                )}
                {status === "error" && message && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                    <WarningCircleIcon className="size-3.5" weight="fill" />
                    {message}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
      <SubscriptionPanel canManage={canManage} />
      <MomoAccounts />
    </SectionPage>
  )
}
