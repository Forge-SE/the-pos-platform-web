import { useState } from "react"
import { CheckCircleIcon } from "@phosphor-icons/react"

import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { ChangePinForm } from "@/features/auth/change-pin-form"
import { getAccessTokenProfile, setAuthSession } from "@/lib/auth-token"

export function PinSetting() {
  const { t } = useLanguage()
  const profile = getAccessTokenProfile()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!profile) return null

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-2">
        {saved && (
          <p
            role="status"
            className="flex items-center gap-1.5 text-xs text-primary"
          >
            <CheckCircleIcon
              aria-hidden="true"
              className="size-4"
              weight="fill"
            />
            {t("Your PIN was changed.")}
          </p>
        )}
        <Button
          variant="outline"
          onClick={() => {
            setSaved(false)
            setOpen(true)
          }}
        >
          {t("Change PIN")}
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-72">
      <ChangePinForm
        userId={profile.sub}
        onChanged={(payload) => {
          setAuthSession(payload)
          setOpen(false)
          setSaved(true)
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}
