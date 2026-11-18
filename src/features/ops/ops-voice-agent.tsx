import { useEffect, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation } from "@apollo/client/react"

import { Button } from "@/components/ui/button"
import { FieldDescription, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { mutationMessage } from "@/features/menu/model"
import { opsAuthContext } from "@/lib/ops-token"

const PROVISION_VOICE_AGENT_LOGIN = gql`
  mutation PlatformProvisionVoiceAgentLogin($restaurantId: ID!, $pin: String!) {
    platformProvisionVoiceAgentLogin(restaurantId: $restaurantId, pin: $pin) {
      id
      active
    }
  }
`

const SET_VOICE_AGENT = gql`
  mutation PlatformSetRestaurantVoiceAgent($id: ID!, $voiceAgentId: String) {
    platformSetRestaurantVoiceAgent(id: $id, voiceAgentId: $voiceAgentId) {
      id
      voiceAgentId
    }
  }
`

/** Links the restaurant to its phone ordering agent so managers can assign a cloned voice. */
export function VoiceAgentField({
  restaurantId,
  voiceAgentId,
}: {
  restaurantId: string
  voiceAgentId: string | null
}) {
  const [value, setValue] = useState(voiceAgentId ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [save, { loading }] = useMutation(SET_VOICE_AGENT, {
    context: opsAuthContext(),
  })
  useEffect(() => setValue(voiceAgentId ?? ""), [voiceAgentId])

  const changed = value.trim() !== (voiceAgentId ?? "")

  async function submit() {
    setError(null)
    setSaved(false)
    try {
      await save({
        variables: { id: restaurantId, voiceAgentId: value.trim() || null },
      })
      setSaved(true)
    } catch (mutationError) {
      setError(mutationMessage(mutationError, "Could not save the agent id."))
    }
  }

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="flex gap-2">
        <Input
          aria-label="Voice agent id"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setSaved(false)
          }}
          placeholder="Not linked"
          maxLength={64}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          aria-invalid={Boolean(error)}
        />
        <Button type="submit" variant="outline" disabled={!changed || loading}>
          {loading ? "Saving…" : "Save"}
        </Button>
      </div>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <FieldDescription>
          {saved
            ? "Saved. Managers can now assign a cloned voice."
            : "The agent id from the voice ordering service. Leave empty to unlink."}
        </FieldDescription>
      )}
    </form>
  )
}

/**
 * The restaurant's VOICE_AGENT staff login, used by the voice server with
 * login(userId, pin). It is restricted to phone ordering on the API and never
 * appears on the till's staff rail or the Team page.
 */
export function VoiceAgentLogin({
  restaurantId,
  login,
  onChanged,
}: {
  restaurantId: string
  login: { id: string; active: boolean } | null
  onChanged: () => Promise<unknown>
}) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [provision, { loading }] = useMutation(PROVISION_VOICE_AGENT_LOGIN, {
    context: opsAuthContext(),
  })

  async function submit() {
    setError(null)
    setSaved(false)
    if (!/^\d{4}$/.test(pin)) {
      setError("Enter a four-digit PIN.")
      return
    }
    try {
      await provision({ variables: { restaurantId, pin } })
      setPin("")
      setSaved(true)
      await onChanged()
    } catch (mutationError) {
      setError(
        mutationMessage(mutationError, "Could not save the agent login.")
      )
    }
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">Agent login</p>
      {login ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              User id{login.active ? "" : " · inactive"}
            </p>
            <p className="truncate font-mono text-sm">{login.id}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigator.clipboard
                .writeText(login.id)
                .then(() => setCopied(true))
                .catch(() => setCopied(false))
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No agent login yet. Set a PIN to create one.
        </p>
      )}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Input
          aria-label={login ? "New agent PIN" : "Agent PIN"}
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={4}
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, ""))
            setSaved(false)
          }}
          placeholder="4-digit PIN"
          aria-invalid={Boolean(error)}
        />
        <Button type="submit" variant="outline" disabled={loading || !pin}>
          {loading ? "Saving…" : login ? "Change PIN" : "Create login"}
        </Button>
      </form>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <FieldDescription>
          {saved
            ? "Saved. Share the user id and PIN with the voice team through your secrets channel."
            : "The login can only take phone orders. A new PIN does not end sessions already signed in; deactivate the login under Staff to cut those off."}
        </FieldDescription>
      )}
    </div>
  )
}
