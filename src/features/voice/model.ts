import { CombinedGraphQLErrors, gql } from "@apollo/client"

import type { StatusTone } from "@/components/ui/status-badge"
import { getValidAccessToken, refreshAccessToken } from "@/lib/auth-session"
import { graphqlUrl } from "@/lib/graphql-url"

export const VOICE_PROFILES_QUERY = gql`
  query VoiceProfiles {
    voiceProfiles {
      id
      name
      description
      status
      statusDetail
      createdAt
      lastCheckedAt
    }
    agentVoice {
      linked
      source
      voiceProfileId
      voiceProfileName
      status
    }
  }
`

const AGENT_VOICE_FIELDS = `
  linked
  source
  voiceProfileId
  voiceProfileName
  status
`

export const ASSIGN_AGENT_VOICE = gql`
  mutation AssignAgentVoice($voiceProfileId: ID!) {
    assignAgentVoice(voiceProfileId: $voiceProfileId) { ${AGENT_VOICE_FIELDS} }
  }
`

export const USE_DEFAULT_AGENT_VOICE = gql`
  mutation UseDefaultAgentVoice {
    useDefaultAgentVoice { ${AGENT_VOICE_FIELDS} }
  }
`

export const REFRESH_VOICE_PROFILE = gql`
  mutation RefreshVoiceProfile($id: ID!) {
    refreshVoiceProfile(id: $id) {
      id
      status
      statusDetail
      lastCheckedAt
    }
  }
`

export const DELETE_VOICE_PROFILE = gql`
  mutation DeleteVoiceProfile($id: ID!) {
    deleteVoiceProfile(id: $id)
  }
`

export interface VoiceProfile {
  id: string
  name: string
  description: string | null
  status: string
  statusDetail: string | null
  createdAt: string
  lastCheckedAt: string | null
}

export interface AgentVoice {
  linked: boolean
  source: "custom" | "default" | string
  voiceProfileId: string | null
  voiceProfileName: string | null
  status: string | null
}

export interface VoiceProfilesData {
  voiceProfiles: VoiceProfile[]
  agentVoice: AgentVoice
}

/** Status names come from the voice service; anything unknown is treated as not usable. */
export const voiceStatusMeta: Record<
  string,
  { label: string; tone: StatusTone; usable: boolean; deletable: boolean }
> = {
  active: { label: "Ready", tone: "success", usable: true, deletable: true },
  processing: {
    label: "Creating…",
    tone: "info",
    usable: false,
    deletable: false,
  },
  pending: {
    label: "Pending",
    tone: "neutral",
    usable: false,
    deletable: false,
  },
  verification_required: {
    label: "Verification required",
    tone: "warning",
    usable: false,
    deletable: true,
  },
  failed: {
    label: "Failed",
    tone: "destructive",
    usable: false,
    deletable: true,
  },
  disabled: {
    label: "Disabled",
    tone: "neutral",
    usable: false,
    deletable: true,
  },
}

export function statusMeta(status: string) {
  return (
    voiceStatusMeta[status] ?? {
      label: status.replace(/_/g, " "),
      tone: "neutral" as const,
      usable: false,
      deletable: true,
    }
  )
}

/** Recording rules shared with the voice service (see the partner contract). */
export const MAX_TAKES = 5
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024
export const MIN_SECONDS = 20
export const GOOD_SECONDS = 60
export const MAX_NAME_LENGTH = 120
export const MIN_CONSENT_REFERENCE = 3

export interface Take {
  id: string
  blob: Blob
  seconds: number
  url: string
}

export function totalSeconds(takes: readonly Take[]) {
  return takes.reduce((sum, take) => sum + take.seconds, 0)
}

export function totalBytes(takes: readonly Take[]) {
  return takes.reduce((sum, take) => sum + take.blob.size, 0)
}

export function formatDuration(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`
}

export function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** File extension for a recorder MIME type; the server uses it when the type is generic. */
export function extensionFor(type: string) {
  const base = type.split(";")[0]?.trim().toLowerCase() ?? ""
  if (base === "audio/webm" || base === "video/webm") return "webm"
  if (base === "audio/mp4" || base === "audio/x-m4a" || base === "video/mp4")
    return "m4a"
  if (base === "audio/ogg") return "ogg"
  if (base === "audio/wav" || base === "audio/x-wav") return "wav"
  if (base === "audio/mpeg") return "mp3"
  if (base === "audio/flac") return "flac"
  return "webm"
}

/** Where a take can be submitted: every take must be ≥ 20 s in total, within size. */
export function takesProblem(takes: readonly Take[]): string | null {
  if (takes.length === 0) return "Record at least one take."
  if (totalSeconds(takes) < MIN_SECONDS)
    return "Record at least 20 seconds of speech in total."
  if (totalBytes(takes) > MAX_TOTAL_BYTES)
    return "That recording is too large; send less than 20 MB in total."
  return null
}

export class VoiceRequestError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
    readonly status: number
  ) {
    super(message)
  }
}

export const UNAVAILABLE_MESSAGE =
  "Voice cloning is not available for this restaurant. Contact support."

export function voiceErrorCode(error: unknown): string | null {
  if (error instanceof VoiceRequestError) return error.code
  if (CombinedGraphQLErrors.is(error)) {
    const code = error.errors[0]?.extensions?.code
    return typeof code === "string" ? code : null
  }
  return null
}

export function voiceErrorMessage(error: unknown, fallback: string) {
  if (voiceErrorCode(error) === "VOICE_UNAVAILABLE") return UNAVAILABLE_MESSAGE
  if (CombinedGraphQLErrors.is(error))
    return error.errors[0]?.message ?? fallback
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function voiceEndpoint(path: "clone" | "preview") {
  const origin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin
  const url = new URL(graphqlUrl, origin)
  url.pathname = url.pathname.replace(/\/graphql\/?$/, "") + `/voice/${path}`
  return url.toString()
}

function readError(status: number, text: string) {
  try {
    const body = JSON.parse(text) as {
      error?: { code?: string; message?: string }
    }
    return new VoiceRequestError(
      body.error?.message ?? "Something went wrong. Try again.",
      body.error?.code ?? null,
      status
    )
  } catch {
    return new VoiceRequestError(
      status === 413
        ? "That recording is too large; send less than 20 MB in total."
        : "The voice service is unavailable. Try again in a few minutes.",
      null,
      status
    )
  }
}

function send(
  path: "clone" | "preview",
  token: string | null,
  body: FormData | string,
  options: { onUploadProgress?: (fraction: number) => void; audio?: boolean }
) {
  return new Promise<{ status: number; response: unknown; text: string }>(
    (resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open("POST", voiceEndpoint(path))
      if (token) request.setRequestHeader("Authorization", `Bearer ${token}`)
      if (typeof body === "string")
        request.setRequestHeader("Content-Type", "application/json")
      request.responseType = options.audio ? "blob" : "text"
      request.upload.onprogress = (event) => {
        if (event.lengthComputable)
          options.onUploadProgress?.(event.loaded / event.total)
      }
      request.onload = () =>
        resolve({
          status: request.status,
          response: request.response as unknown,
          text: options.audio ? "" : request.responseText,
        })
      request.onerror = () =>
        reject(
          new VoiceRequestError(
            "Could not reach the server. Check your connection and try again.",
            null,
            0
          )
        )
      request.send(body)
    }
  )
}

async function authorizedSend(
  path: "clone" | "preview",
  body: () => FormData | string,
  options: { onUploadProgress?: (fraction: number) => void; audio?: boolean }
) {
  let result = await send(path, await getValidAccessToken(), body(), options)
  if (result.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) result = await send(path, refreshed, body(), options)
  }
  if (result.status >= 200 && result.status < 300) return result
  const text =
    options.audio && result.response instanceof Blob
      ? await result.response.text()
      : result.text
  throw readError(result.status, text)
}

export interface CloneInput {
  name: string
  description: string
  consentReference: string
  removeBackgroundNoise: boolean
  takes: readonly Take[]
}

export async function cloneVoice(
  input: CloneInput,
  onUploadProgress?: (fraction: number) => void
): Promise<{ profile: VoiceProfile & { status: string }; reused: boolean }> {
  const result = await authorizedSend(
    "clone",
    () => {
      const form = new FormData()
      form.append("name", input.name.trim())
      if (input.description.trim())
        form.append("description", input.description.trim())
      // Consent is confirmed by the checkbox gate before this step is reachable.
      form.append("consent_confirmed", "true")
      form.append("consent_reference", input.consentReference.trim())
      form.append(
        "remove_background_noise",
        input.removeBackgroundNoise ? "true" : "false"
      )
      input.takes.forEach((take, index) => {
        const type = take.blob.type || "audio/webm"
        form.append(
          "files",
          new File([take.blob], `take-${index + 1}.${extensionFor(type)}`, {
            type,
          })
        )
      })
      return form
    },
    { onUploadProgress }
  )
  return JSON.parse(result.text) as {
    profile: VoiceProfile
    reused: boolean
  }
}

/** Plays the phone agent's currently assigned voice. */
export async function fetchVoicePreview(text?: string): Promise<Blob> {
  const result = await authorizedSend(
    "preview",
    () => JSON.stringify({ text }),
    { audio: true }
  )
  return result.response as Blob
}
