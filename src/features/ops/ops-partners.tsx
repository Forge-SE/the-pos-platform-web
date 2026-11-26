import { useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { HandshakeIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { OpsHeader } from "@/features/ops/ops-shell"
import { opsAuthContext } from "@/lib/ops-token"

const PARTNERS = gql`
  query PlatformPartnerInvites {
    platformPartnerInvites {
      id
      code
      label
      status
      createdAt
      entryCount
      application {
        id
        status
        fullName
        email
        phone
        restaurantName
        description
        slug
        defaultDiningType
        openingHours { day closed opens closes }
        compliance {
          businessRegistrationNumber
          tin
          foodHygienePermit
          districtAssemblyPermit
          notes
        }
        address
        city
        region
        restaurantId
        createdAt
      }
    }
  }
`

const CREATE = gql`
  mutation PlatformCreatePartnerInvite($label: String!) {
    platformCreatePartnerInvite(label: $label) {
      id
      code
      label
    }
  }
`

const REVIEW = gql`
  mutation PlatformReviewPartnerApplication(
    $id: ID!
    $decision: String!
    $ownerPin: String
  ) {
    platformReviewPartnerApplication(
      id: $id
      decision: $decision
      ownerPin: $ownerPin
    ) {
      id
      status
      restaurantId
    }
  }
`

interface Application {
  id: string
  status: string
  fullName: string
  email: string
  phone: string
  restaurantName: string
  description: string | null
  slug: string
  defaultDiningType: string
  openingHours: { day: string; closed: boolean; opens: string | null; closes: string | null }[]
  compliance: {
    businessRegistrationNumber: string | null
    tin: string | null
    foodHygienePermit: string | null
    districtAssemblyPermit: string | null
    notes: string | null
  } | null
  address: string
  city: string
  region: string
  restaurantId: string | null
  createdAt: string
}

interface Invite {
  id: string
  code: string
  label: string
  status: string
  createdAt: string
  entryCount: number
  application: Application | null
}

export function OpsPartners() {
  const { data, loading, refetch } = useQuery<{
    platformPartnerInvites: Invite[]
  }>(PARTNERS, { context: opsAuthContext() })
  const [createInvite, { loading: creating }] = useMutation<
    { platformCreatePartnerInvite: { label: string; code: string } },
    { label: string }
  >(CREATE, {
    context: opsAuthContext(),
  })
  const [review, { loading: reviewing }] = useMutation(REVIEW, {
    context: opsAuthContext(),
  })
  const [label, setLabel] = useState("")
  const [issued, setIssued] = useState<{ label: string; code: string } | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const invites = data?.platformPartnerInvites ?? []

  async function issue() {
    setError(null)
    try {
      const result = await createInvite({
        variables: { label: label.trim() },
      })
      const created = result.data?.platformCreatePartnerInvite
      if (created) setIssued(created)
      setLabel("")
      await refetch()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create a code.")
    }
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    setError(null)
    try {
      await review({
        variables: {
          id,
          decision,
          ownerPin: null,
        },
      })
      await refetch()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not review that application."
      )
    }
  }

  return (
    <section>
      <OpsHeader
        title="Partner applications"
        description="Generate a code, send the join link, and approve a draft before the restaurant is created."
      />
      <div className="space-y-6 px-5 pb-10 lg:px-8">
        <form
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            void issue()
          }}
        >
          <Field className="min-w-0 flex-1">
            <FieldLabel htmlFor="partner-label">Partner name</FieldLabel>
            <Input
              id="partner-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Restaurant or group you agreed to onboard"
              required
            />
          </Field>
          <Button type="submit" disabled={creating || label.trim().length < 2}>
            <HandshakeIcon />
            Generate code
          </Button>
        </form>
        {issued ? (
          <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
            Code for {issued.label}:{" "}
            <span className="font-semibold tracking-[0.18em]">{issued.code}</span>
            . Send them the marketing site’s join page and this code.
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading applications…</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No partner codes yet. Generate one when a restaurant is ready to apply.
          </p>
        ) : (
          <ul className="space-y-3">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-semibold">{invite.label}</p>
                    <p className="mt-1 font-mono text-sm tracking-[0.16em]">
                      {invite.code}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {invite.status} · {invite.entryCount} code{" "}
                    {invite.entryCount === 1 ? "entry" : "entries"}
                  </p>
                </div>
                {invite.application ? (
                  <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                    <p className="font-medium">
                      {invite.application.restaurantName}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {invite.application.status}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      {invite.application.fullName} · {invite.application.email} ·{" "}
                      {invite.application.phone}
                    </p>
                    <p>
                      {invite.application.address}, {invite.application.city},{" "}
                      {invite.application.region}
                    </p>
                    <p className="text-muted-foreground">
                      {invite.application.slug} ·{" "}
                      {invite.application.defaultDiningType === "DINE_IN"
                        ? "Dine in"
                        : "Takeaway"}
                    </p>
                    {invite.application.description ? (
                      <p>{invite.application.description}</p>
                    ) : null}
                    <p className="text-muted-foreground">
                      {invite.application.openingHours
                        .map((row) =>
                          row.closed
                            ? `${row.day.slice(0, 3)} closed`
                            : `${row.day.slice(0, 3)} ${row.opens}–${row.closes}`
                        )
                        .join(", ")}
                    </p>
                    {invite.application.compliance ? (
                      <p className="text-muted-foreground">
                        {[
                          invite.application.compliance.businessRegistrationNumber,
                          invite.application.compliance.tin,
                          invite.application.compliance.foodHygienePermit,
                          invite.application.compliance.districtAssemblyPermit,
                          invite.application.compliance.notes,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {invite.application.status === "submitted" ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <Button
                          type="button"
                          disabled={reviewing}
                          onClick={() => void decide(invite.application!.id, "approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={reviewing}
                          onClick={() => void decide(invite.application!.id, "rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Waiting for the partner to enter this code and send their details.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
