import { useState } from "react"
import { useQuery } from "@apollo/client/react"
import { ArrowLeftIcon, CheckCircleIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { MomoAccounts } from "@/features/payouts/momo-accounts"
import { MOMO_ACCOUNTS_QUERY } from "@/features/payouts/model"
import type { MomoAccount } from "@/features/payouts/model"

export function OnboardingPayoutsStep({
  onBack,
  onFinish,
  finishing,
}: {
  onBack: () => void
  onFinish: () => void
  finishing: boolean
}) {
  const { data } = useQuery<{ momoAccounts: MomoAccount[] }>(
    MOMO_ACCOUNTS_QUERY
  )
  const [error, setError] = useState<string | null>(null)
  const ready = (data?.momoAccounts.length ?? 0) > 0

  return (
    <div className="mt-7">
      <MomoAccounts embedded />
      {error && <FieldError className="mt-3">{error}</FieldError>}
      <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={finishing}
        >
          <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
          Back
        </Button>
        <Button
          type="button"
          className="min-w-32"
          disabled={finishing}
          onClick={() => {
            if (!ready) {
              setError("Add at least one mobile money number to finish.")
              return
            }
            onFinish()
          }}
        >
          <CheckCircleIcon aria-hidden="true" data-icon="inline-start" />
          Finish setup
        </Button>
      </div>
    </div>
  )
}
