// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { CombinedGraphQLErrors } from "@apollo/client"
import { MicrophoneIcon } from "@phosphor-icons/react"

import { SettingsDialog } from "@/components/settings/settings-layout"
import { VoiceSettings } from "./voice-settings"
import type { VoiceProfilesData } from "./model"

const runtime = vi.hoisted(() => ({
  data: undefined as VoiceProfilesData | undefined,
  error: null as Error | null,
  mutate: vi.fn(),
  refetch: vi.fn(),
  toast: vi.fn(),
}))

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: runtime.data,
    loading: false,
    error: runtime.error,
    refetch: runtime.refetch,
  }),
  useMutation: () => [runtime.mutate, { loading: false }],
}))
vi.mock("@/components/ui/toaster", () => ({ toast: runtime.toast }))

const agent = {
  linked: true,
  source: "default",
  voiceProfileId: null,
  voiceProfileName: null,
  status: null,
}

function profile(id: string, status: string, name = `Voice ${id}`) {
  return {
    id,
    name,
    description: null,
    status,
    statusDetail: null,
    createdAt: "2026-11-12T09:00:00Z",
    lastCheckedAt: null,
  }
}

function view() {
  return render(
    <SettingsDialog
      open
      label="Restaurant settings"
      items={[{ id: "voice", label: "Phone voice", icon: MicrophoneIcon }]}
      section="voice"
      onSectionChange={vi.fn()}
      onOpenChange={vi.fn()}
    >
      <VoiceSettings />
    </SettingsDialog>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  runtime.data = { voiceProfiles: [], agentVoice: agent }
  runtime.error = null
  runtime.mutate.mockResolvedValue({})
  runtime.refetch.mockResolvedValue({})
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("phone voice settings", () => {
  it("explains unavailable configuration without offering a retry", () => {
    runtime.data = undefined
    runtime.error = new CombinedGraphQLErrors({
      errors: [{ message: "x", extensions: { code: "VOICE_UNAVAILABLE" } }],
    })
    view()
    expect(screen.getByRole("alert").textContent).toContain(
      "not available for this restaurant"
    )
    expect(
      screen.queryByRole("button", { name: /Try again|Check again/ })
    ).toBeNull()
  })

  it("offers recording from a single empty-state action", () => {
    view()
    expect(screen.getByText("No cloned voices yet")).toBeTruthy()
    expect(
      screen.getAllByRole("button", { name: "Record a new voice" })
    ).toHaveLength(1)
  })

  it("keeps verification-required voices out of assignment and offers a status check", () => {
    runtime.data = {
      voiceProfiles: [profile("p1", "verification_required", "Mama Ama")],
      agentVoice: agent,
    }
    view()
    expect(screen.getByText("Verification required")).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "Use on phone agent" })
    ).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Check status" }))
    expect(runtime.mutate).toHaveBeenCalledWith({ variables: { id: "p1" } })
  })

  it("assigns a ready voice to the linked phone agent", async () => {
    runtime.data = {
      voiceProfiles: [profile("p1", "active")],
      agentVoice: agent,
    }
    view()
    fireEvent.click(screen.getByRole("button", { name: "Use on phone agent" }))
    await waitFor(() =>
      expect(runtime.mutate).toHaveBeenCalledWith({
        variables: { voiceProfileId: "p1" },
      })
    )
  })

  it("does not let the voice in use be deleted", () => {
    runtime.data = {
      voiceProfiles: [profile("p1", "active", "Mama Ama")],
      agentVoice: {
        ...agent,
        source: "custom",
        voiceProfileId: "p1",
        voiceProfileName: "Mama Ama",
        status: "active",
      },
    }
    view()
    expect(screen.getByText("On phone agent")).toBeTruthy()
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Delete Mama Ama" })
        .disabled
    ).toBe(true)
  })

  it("confirms before permanently deleting a voice", async () => {
    runtime.data = {
      voiceProfiles: [profile("p2", "failed", "Old take")],
      agentVoice: agent,
    }
    view()
    fireEvent.click(screen.getByRole("button", { name: "Delete Old take" }))
    expect(runtime.mutate).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole("button", { name: "Delete voice" }))
    await waitFor(() =>
      expect(runtime.mutate).toHaveBeenCalledWith({ variables: { id: "p2" } })
    )
  })

  it("explains that no phone agent is linked yet", () => {
    runtime.data = {
      voiceProfiles: [],
      agentVoice: { ...agent, linked: false },
    }
    view()
    expect(screen.getByText(/No phone agent is linked/)).toBeTruthy()
  })
})
