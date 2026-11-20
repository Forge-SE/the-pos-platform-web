import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "@apollo/client/react"
import { format } from "date-fns"
import {
  ArrowClockwiseIcon,
  MicrophoneIcon,
  PlayIcon,
  SpinnerGapIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import {
  ContentState,
  EmptyState,
  ErrorState,
} from "@/components/content-state"
import { useLanguage } from "@/components/language-provider"
import {
  SettingsBody,
  SettingsHeader,
} from "@/components/settings/settings-layout"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { toast } from "@/components/ui/toaster"
import { MenuDialog } from "@/features/menu/modals/menu-dialog"
import { CloneVoiceDialog } from "@/features/voice/clone-voice-dialog"
import {
  ASSIGN_AGENT_VOICE,
  DELETE_VOICE_PROFILE,
  REFRESH_VOICE_PROFILE,
  UNAVAILABLE_MESSAGE,
  USE_DEFAULT_AGENT_VOICE,
  VOICE_PROFILES_QUERY,
  fetchVoicePreview,
  statusMeta,
  voiceErrorCode,
  voiceErrorMessage,
} from "@/features/voice/model"
import type {
  AgentVoice,
  VoiceProfile,
  VoiceProfilesData,
} from "@/features/voice/model"

const DEFAULT_VOICE = "__default__"

export function VoiceSettings() {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useQuery<VoiceProfilesData>(
    VOICE_PROFILES_QUERY,
    { notifyOnNetworkStatusChange: true }
  )
  const [cloneOpen, setCloneOpen] = useState(false)
  const profiles = data?.voiceProfiles ?? []
  const agent = data?.agentVoice
  const assign = useAssignVoice()

  const unavailable = error && voiceErrorCode(error) === "VOICE_UNAVAILABLE"

  return (
    <>
      <SettingsHeader
        title="Phone voice"
        description="Clone a team member's voice for the phone ordering agent."
        actions={
          profiles.length > 0 ? (
            <Button onClick={() => setCloneOpen(true)}>
              <MicrophoneIcon aria-hidden />
              {t("Record a new voice")}
            </Button>
          ) : undefined
        }
      />
      <SettingsBody>
        {loading && !data ? (
          <LibrarySkeleton />
        ) : unavailable ? (
          <ContentState
            error
            title="Voice cloning is not available"
            description={UNAVAILABLE_MESSAGE}
            action={null}
          />
        ) : error ? (
          <ErrorState
            title="Could not load your voices"
            description={voiceErrorMessage(
              error,
              "Try again to load the latest data."
            )}
            onRetry={() => refetch()}
          />
        ) : (
          <>
            {agent && (
              <AgentVoicePanel
                agent={agent}
                profiles={profiles}
                assign={assign}
              />
            )}
            <section className="py-6">
              <h3 className="text-sm font-medium">{t("Voice library")}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t(
                  "Voices cloned for this restaurant. Only your team sees them."
                )}
              </p>
              {profiles.length === 0 ? (
                <EmptyState
                  icon={<MicrophoneIcon />}
                  title="No cloned voices yet"
                  description="Record 1–2 minutes of speech to create one."
                  action={
                    <Button size="lg" onClick={() => setCloneOpen(true)}>
                      {t("Record a new voice")}
                    </Button>
                  }
                />
              ) : (
                <ul className="mt-4 divide-y divide-border rounded-lg border">
                  {profiles.map((profile) => (
                    <VoiceRow
                      key={profile.id}
                      profile={profile}
                      agent={agent}
                      onAssign={() => void assign.run(profile.id)}
                      assigning={assign.pendingId === profile.id}
                      onDeleted={() => refetch()}
                    />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </SettingsBody>
      <CloneVoiceDialog
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        onCreated={() => refetch()}
        onAssign={
          agent?.linked ? (profile) => void assign.run(profile.id) : undefined
        }
      />
    </>
  )
}

function useAssignVoice() {
  const { t } = useLanguage()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const refetchQueries = [{ query: VOICE_PROFILES_QUERY }]
  const [assignVoice] = useMutation(ASSIGN_AGENT_VOICE, { refetchQueries })
  const [useDefault] = useMutation(USE_DEFAULT_AGENT_VOICE, { refetchQueries })

  async function run(profileId: string | null) {
    setPendingId(profileId ?? DEFAULT_VOICE)
    try {
      if (profileId)
        await assignVoice({ variables: { voiceProfileId: profileId } })
      else await useDefault()
      toast({
        status: "success",
        title: t("Phone voice updated"),
        description: t("Changes apply from the next call."),
      })
      return true
    } catch (assignError) {
      toast({
        status: "error",
        title: t("Could not change the phone voice"),
        description: t(
          voiceErrorMessage(assignError, "Try again in a few minutes.")
        ),
      })
      return false
    } finally {
      setPendingId(null)
    }
  }

  return { run, pendingId }
}

function AgentVoicePanel({
  agent,
  profiles,
  assign,
}: {
  agent: AgentVoice
  profiles: VoiceProfile[]
  assign: ReturnType<typeof useAssignVoice>
}) {
  const { t } = useLanguage()
  const selected =
    agent.source === "custom" && agent.voiceProfileId
      ? agent.voiceProfileId
      : DEFAULT_VOICE
  // Optimistic selection; reverts to the server value if the change fails.
  const [choice, setChoice] = useState(selected)
  useEffect(() => setChoice(selected), [selected])
  const preview = useVoicePreview()

  if (!agent.linked)
    return (
      <section className="border-b border-dashed border-border/70 py-6">
        <h3 className="text-sm font-medium">{t("Phone agent voice")}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t(
            "No phone agent is linked to this restaurant yet. You can still record voices; contact support to connect your phone line."
          )}
        </p>
      </section>
    )

  const usable = profiles.filter((profile) => statusMeta(profile.status).usable)
  const items = [
    { value: DEFAULT_VOICE, label: t("Use platform default") },
    ...usable.map((profile) => ({ value: profile.id, label: profile.name })),
  ]
  // A stale assignment (failed or deleted clone) still shows by name.
  if (
    selected !== DEFAULT_VOICE &&
    !items.some((item) => item.value === selected)
  )
    items.push({
      value: selected,
      label: agent.voiceProfileName ?? t("Cloned voice"),
    })
  const stale =
    agent.source === "custom" &&
    agent.status !== null &&
    agent.status !== "active"
  const busy = assign.pendingId !== null

  async function change(value: string) {
    const previous = choice
    setChoice(value)
    const ok = await assign.run(value === DEFAULT_VOICE ? null : value)
    if (!ok) setChoice(previous)
  }

  return (
    <section className="border-b border-dashed border-border/70 py-6">
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-sm font-medium">{t("Phone agent voice")}</h3>
          <p className="mt-1 text-sm">
            {t("Voice:")}{" "}
            <span className="font-medium">
              {agent.source === "custom"
                ? `${agent.voiceProfileName ?? t("Cloned voice")} (${t("cloned")})`
                : t("Platform default")}
            </span>
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t(
              "Changes apply from the next call. Calls in progress keep their current voice."
            )}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Select
            items={items}
            value={choice}
            onValueChange={(value) => {
              if (value && value !== choice) void change(value)
            }}
            disabled={busy}
          >
            <SelectTrigger
              className="min-w-0 flex-1"
              aria-label={t("Change voice")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={
              agent.source !== "custom" || stale || busy || preview.loading
            }
            onClick={() => void preview.play()}
          >
            {preview.loading ? (
              <SpinnerGapIcon
                className="animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : (
              <PlayIcon aria-hidden />
            )}
            {t("Play sample")}
          </Button>
        </div>
      </div>
      {stale && (
        <p
          className="mt-4 flex items-start gap-2 text-sm text-warning-foreground"
          role="alert"
        >
          <WarningCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t(
            "The assigned voice is no longer usable; calls are using the default voice."
          )}
        </p>
      )}
    </section>
  )
}

function useVoicePreview() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const url = useRef<string | null>(null)

  useEffect(
    () => () => {
      audio.current?.pause()
      if (url.current) URL.revokeObjectURL(url.current)
    },
    []
  )

  async function play() {
    setLoading(true)
    try {
      const blob = await fetchVoicePreview()
      audio.current?.pause()
      if (url.current) URL.revokeObjectURL(url.current)
      url.current = URL.createObjectURL(blob)
      audio.current = new Audio(url.current)
      await audio.current.play()
    } catch (previewError) {
      toast({
        status: "error",
        title: t("Could not play a sample"),
        description: t(
          voiceErrorMessage(previewError, "Try again in a few minutes.")
        ),
      })
    } finally {
      setLoading(false)
    }
  }

  return { play, loading }
}

function VoiceRow({
  profile,
  agent,
  onAssign,
  assigning,
  onDeleted,
}: {
  profile: VoiceProfile
  agent: AgentVoice | undefined
  onAssign: () => void
  assigning: boolean
  onDeleted: () => Promise<unknown>
}) {
  const { t } = useLanguage()
  const meta = statusMeta(profile.status)
  const inUse =
    agent?.source === "custom" && agent.voiceProfileId === profile.id
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [refresh, refreshState] = useMutation(REFRESH_VOICE_PROFILE)
  const [remove, removeState] = useMutation(DELETE_VOICE_PROFILE)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function checkStatus() {
    try {
      const result = await refresh({ variables: { id: profile.id } })
      const status = (
        result.data as { refreshVoiceProfile?: { status: string } } | undefined
      )?.refreshVoiceProfile?.status
      toast({
        status: status === "active" ? "success" : "information",
        title: t(status === "active" ? "Voice is ready" : "Status checked"),
        description: status ? t(statusMeta(status).label) : undefined,
      })
    } catch (refreshError) {
      toast({
        status: "error",
        title: t("Could not check the status"),
        description: t(
          voiceErrorMessage(refreshError, "Try again in a few minutes.")
        ),
      })
    }
  }

  async function confirmDelete() {
    setDeleteError(null)
    try {
      await remove({ variables: { id: profile.id } })
      setConfirmOpen(false)
      await onDeleted()
      toast({ status: "success", title: t("Voice deleted") })
    } catch (removeError) {
      setDeleteError(
        voiceErrorMessage(removeError, "Could not delete the voice.")
      )
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{profile.name}</p>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          {inUse && <StatusBadge tone="info">On phone agent</StatusBadge>}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[
            profile.description,
            format(new Date(profile.createdAt), "d MMM yyyy"),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {profile.status === "verification_required" && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t(
              "Waiting for the voice provider to verify it. Contact support, then check its status."
            )}
          </p>
        )}
        {profile.statusDetail && profile.status !== "active" && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {profile.statusDetail}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {meta.usable && !inUse && agent?.linked && (
          <Button
            size="sm"
            variant="outline"
            disabled={assigning}
            onClick={onAssign}
          >
            {t(assigning ? "Saving…" : "Use on phone agent")}
          </Button>
        )}
        {!meta.usable && (
          <Button
            size="sm"
            variant="ghost"
            disabled={refreshState.loading}
            onClick={() => void checkStatus()}
          >
            <ArrowClockwiseIcon
              aria-hidden
              className={
                refreshState.loading
                  ? "animate-spin motion-reduce:animate-none"
                  : ""
              }
            />
            {t(refreshState.loading ? "Checking…" : "Check status")}
          </Button>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`${t("Delete")} ${profile.name}`}
          disabled={!meta.deletable || inUse}
          title={
            inUse
              ? t("Switch the phone agent to another voice first.")
              : undefined
          }
          onClick={() => setConfirmOpen(true)}
        >
          <TrashIcon />
        </Button>
      </div>
      <MenuDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!removeState.loading) setConfirmOpen(open)
          if (!open) setDeleteError(null)
        }}
        title={t("Delete this voice?")}
        description={profile.name}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="lg"
              disabled={removeState.loading}
              onClick={() => setConfirmOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              disabled={removeState.loading}
              onClick={() => void confirmDelete()}
            >
              {t(removeState.loading ? "Deleting…" : "Delete voice")}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          {t(
            "This permanently deletes the voice, including at the voice provider. It cannot be undone. Agents using it must be switched to another voice first."
          )}
        </p>
        {deleteError && (
          <p
            className="mt-4 flex items-start gap-2 text-sm text-destructive"
            role="alert"
          >
            <WarningCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t(deleteError)}
          </p>
        )}
      </MenuDialog>
    </li>
  )
}

function LibrarySkeleton() {
  return (
    <div className="grid gap-6 py-6" aria-hidden>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
      </div>
      <ul className="divide-y divide-border rounded-lg border">
        {[0, 1, 2].map((row) => (
          <li key={row} className="flex items-center gap-3 px-4 py-3">
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
          </li>
        ))}
      </ul>
    </div>
  )
}
