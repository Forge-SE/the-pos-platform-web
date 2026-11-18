import { useEffect, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation } from "@apollo/client/react"

import { Button } from "@/components/ui/button"
import { FieldDescription, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { mutationMessage } from "@/features/menu/model"
import { opsAuthContext } from "@/lib/ops-token"

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
