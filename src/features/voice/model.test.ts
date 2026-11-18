import { describe, expect, it } from "vitest"
import { CombinedGraphQLErrors } from "@apollo/client"

import {
  UNAVAILABLE_MESSAGE,
  VoiceRequestError,
  extensionFor,
  formatDuration,
  statusMeta,
  takesProblem,
  voiceEndpoint,
  voiceErrorCode,
  voiceErrorMessage,
} from "./model"
import type { Take } from "./model"

function take(seconds: number, bytes = 1000): Take {
  return {
    id: String(Math.random()),
    blob: new Blob([new Uint8Array(bytes)], { type: "audio/webm" }),
    seconds,
    url: "blob:test",
  }
}

describe("recording rules", () => {
  it("blocks submit until there are at least 20 seconds in total", () => {
    expect(takesProblem([])).toBe("Record at least one take.")
    expect(takesProblem([take(12)])).toMatch(/at least 20 seconds/)
    expect(takesProblem([take(12), take(9)])).toBeNull()
  })

  it("blocks recordings over the 20 MB upload cap", () => {
    expect(takesProblem([take(90, 21 * 1024 * 1024)])).toMatch(/too large/)
  })

  it("names takes with an extension the voice service recognises", () => {
    expect(extensionFor("audio/webm;codecs=opus")).toBe("webm")
    expect(extensionFor("audio/mp4")).toBe("m4a")
    expect(extensionFor("")).toBe("webm")
  })

  it("formats the timer as minutes and seconds", () => {
    expect(formatDuration(65.9)).toBe("1:05")
  })
})

describe("status badges", () => {
  it("never treats verification-required voices as ready", () => {
    expect(statusMeta("verification_required")).toMatchObject({
      label: "Verification required",
      tone: "warning",
      usable: false,
    })
    expect(statusMeta("active")).toMatchObject({ label: "Ready", usable: true })
  })

  it("treats unknown future statuses as not usable", () => {
    expect(statusMeta("archived").usable).toBe(false)
  })
})

describe("voice errors", () => {
  it("shows configuration problems as not available, never as a retry", () => {
    const error = new CombinedGraphQLErrors({
      errors: [
        {
          message: "Voice cloning is not available for this restaurant.",
          extensions: { code: "VOICE_UNAVAILABLE" },
        },
      ],
    })
    expect(voiceErrorCode(error)).toBe("VOICE_UNAVAILABLE")
    expect(voiceErrorMessage(error, "fallback")).toBe(UNAVAILABLE_MESSAGE)
  })

  it("shows the server's end-user message for upload refusals", () => {
    const error = new VoiceRequestError(
      "Recordings must be at least 20 seconds.",
      "BAD_USER_INPUT",
      400
    )
    expect(voiceErrorMessage(error, "fallback")).toBe(
      "Recordings must be at least 20 seconds."
    )
  })
})

describe("voice endpoints", () => {
  it("sits beside the GraphQL endpoint on the POS API", () => {
    expect(voiceEndpoint("clone")).toMatch(/\/voice\/clone$/)
    expect(voiceEndpoint("preview")).not.toContain("/graphql")
  })
})
