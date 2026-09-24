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
import { Button } from "@/components/ui/button"
import { getAccessTokenProfile } from "@/lib/auth-token"

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

const REQUEST_LOGO_UPLOAD = gql`
  mutation RequestRestaurantLogoUpload($contentType: String!) {
    requestRestaurantLogoUpload(contentType: $contentType) {
      objectKey
      url
      method
      headers {
        name
        value
      }
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

interface LogoUploadData {
  requestRestaurantLogoUpload: {
    objectKey: string
    url: string
    method: string
    headers: Array<{ name: string; value: string }>
  }
}

export function RestaurantBranding() {
  const profile = getAccessTokenProfile()
  const canManage = profile?.role === "MANAGER" || profile?.role === "OWNER"
  const { data, loading, error, refetch } =
    useQuery<RestaurantData>(RESTAURANT_QUERY)
  const [requestUpload] = useMutation<LogoUploadData>(REQUEST_LOGO_UPLOAD)
  const [completeUpload] = useMutation(COMPLETE_LOGO_UPLOAD)
  const [status, setStatus] = useState<LogoStatus>("idle")
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadLogo(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus("error")
      setMessage("Use JPEG, PNG, or WebP.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus("error")
      setMessage("Logo must be 5 MiB or smaller.")
      return
    }
    try {
      setStatus("uploading")
      setMessage(null)
      const request = await requestUpload({
        variables: { contentType: file.type },
      })
      const upload = request.data?.requestRestaurantLogoUpload
      if (!upload) throw new Error("The upload could not be prepared.")
      const response = await fetch(upload.url, {
        method: upload.method,
        headers: Object.fromEntries(
          upload.headers.map((header: { name: string; value: string }) => [
            header.name,
            header.value,
          ]),
        ),
        body: file,
      })
      if (!response.ok) throw new Error("The logo upload failed.")

      setStatus("verifying")
      await completeUpload({
        variables: { objectKey: upload.objectKey },
      })
      await refetch()
      setStatus("done")
    } catch (uploadError) {
      setStatus("error")
      setMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload logo.",
      )
    }
  }

  const restaurant = data?.restaurant

  return (
    <SectionPage
      title="Settings"
      description="Manage restaurant details and branding."
    >
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-[-0.025em]">
            Restaurant branding
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The logo appears on receipts, the sign-in screen, and the sidebar.
          </p>
          {error ? (
            <div className="mt-6 rounded-lg bg-destructive/5 p-5 text-sm text-destructive">
              Could not load restaurant details.
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => refetch()}
              >
                Try again
              </Button>
            </div>
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
                <p className="truncate text-sm font-semibold">
                  {loading ? "Loading…" : (restaurant?.name ?? "Restaurant")}
                </p>
                {restaurant && (
                  <p className="text-xs text-muted-foreground">
                    {restaurant.slug} · {restaurant.code} · {restaurant.currency}
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
    </SectionPage>
  )
}
