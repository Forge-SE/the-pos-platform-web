import { useEffect, useRef, useState } from "react"
import {
  CheckCircleIcon,
  MicrophoneIcon,
  SpinnerGapIcon,
  StopIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { MenuDialog } from "@/features/menu/modals/menu-dialog"
import {
  GOOD_SECONDS,
  MAX_NAME_LENGTH,
  MAX_TAKES,
  MAX_TOTAL_BYTES,
  MIN_CONSENT_REFERENCE,
  MIN_SECONDS,
  cloneVoice,
  formatDuration,
  formatMegabytes,
  statusMeta,
  takesProblem,
  totalBytes,
  totalSeconds,
  voiceErrorMessage,
} from "@/features/voice/model"
import type { Take, VoiceProfile } from "@/features/voice/model"
import {
  recordingSupported,
  useVoiceRecorder,
} from "@/features/voice/use-voice-recorder"

type Step = "consent" | "record" | "name" | "submitting" | "result"

const stepCopy: Record<Step, { title: string; description: string }> = {
  consent: {
    title: "Record a new voice",
    description: "Step 1 of 3 · Confirm the speaker has agreed.",
  },
  record: {
    title: "Record a new voice",
    description: "Step 2 of 3 · Record 1–2 minutes of natural speech.",
  },
  name: {
    title: "Record a new voice",
    description: "Step 3 of 3 · Name the voice for your library.",
  },
  submitting: {
    title: "Creating voice",
    description: "This can take up to 2 minutes. Keep this window open.",
  },
  result: { title: "Voice created", description: "Your new voice is saved." },
}

export function CloneVoiceDialog({
  open,
  onOpenChange,
  onCreated,
  onAssign,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => Promise<unknown>
  onAssign?: (profile: VoiceProfile) => void
}) {
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>("consent")
  const [consent, setConsent] = useState(false)
  const [consentReference, setConsentReference] = useState("")
  const [takes, setTakes] = useState<Take[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [denoise, setDenoise] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [created, setCreated] = useState<VoiceProfile | null>(null)
  const takesRef = useRef(takes)
  takesRef.current = takes

  const recorder = useVoiceRecorder((take) =>
    setTakes((current) => [...current, take])
  )

  // Object URLs belong to this dialog; release them once it closes.
  useEffect(() => {
    if (open) return
    takesRef.current.forEach((take) => URL.revokeObjectURL(take.url))
    setStep("consent")
    setConsent(false)
    setConsentReference("")
    setTakes([])
    setName("")
    setDescription("")
    setDenoise(false)
    setProgress(0)
    setError(null)
    setTouched(false)
    setCreated(null)
  }, [open])

  const submitting = step === "submitting"
  const recording = recorder.state === "recording"
  const referenceValid = consentReference.trim().length >= MIN_CONSENT_REFERENCE
  const nameValid =
    name.trim().length > 0 && name.trim().length <= MAX_NAME_LENGTH
  const problem = takesProblem(takes)
  const seconds = totalSeconds(takes) + (recording ? recorder.elapsed : 0)

  function removeTake(id: string) {
    setTakes((current) => {
      const take = current.find((item) => item.id === id)
      if (take) URL.revokeObjectURL(take.url)
      return current.filter((item) => item.id !== id)
    })
  }

  async function submit() {
    setError(null)
    setProgress(0)
    setStep("submitting")
    try {
      const result = await cloneVoice(
        {
          name,
          description,
          consentReference,
          removeBackgroundNoise: denoise,
          takes,
        },
        setProgress
      )
      setCreated(result.profile)
      setStep("result")
      await onCreated().catch(() => undefined)
    } catch (cloneError) {
      // Keep the takes so the user can retry without recording again.
      setError(voiceErrorMessage(cloneError, "Could not create the voice."))
      setStep("name")
    }
  }

  function next() {
    setTouched(true)
    if (step === "consent" && consent && referenceValid) {
      setTouched(false)
      setStep("record")
    } else if (step === "record" && !problem && !recording) {
      setTouched(false)
      setStep("name")
    } else if (step === "name" && nameValid) {
      void submit()
    }
  }

  function back() {
    setError(null)
    setTouched(false)
    if (step === "record") setStep("consent")
    if (step === "name") setStep("record")
  }

  const copy = stepCopy[step]
  const meta = created ? statusMeta(created.status) : null

  const footer =
    step === "result" ? (
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
          {t("Done")}
        </Button>
        {created && meta?.usable && onAssign && (
          <Button
            size="lg"
            onClick={() => {
              onAssign(created)
              onOpenChange(false)
            }}
          >
            {t("Use on the phone agent")}
          </Button>
        )}
      </div>
    ) : (
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          variant="ghost"
          size="lg"
          disabled={submitting || recording}
          onClick={() => (step === "consent" ? onOpenChange(false) : back())}
        >
          {t(step === "consent" ? "Cancel" : "Back")}
        </Button>
        <Button size="lg" disabled={submitting || recording} onClick={next}>
          {submitting && (
            <SpinnerGapIcon className="animate-spin motion-reduce:animate-none" />
          )}
          {t(
            submitting
              ? "Creating voice…"
              : step === "name"
                ? "Create voice"
                : "Continue"
          )}
        </Button>
      </div>
    )

  return (
    <MenuDialog
      open={open}
      // Closing mid-upload would lose the result; the provider call keeps running.
      onOpenChange={(nextOpen) => {
        if (!submitting && !recording) onOpenChange(nextOpen)
      }}
      title={t(copy.title)}
      description={t(copy.description)}
      footer={footer}
    >
      {step === "consent" && (
        <div className="grid gap-6">
          <Field orientation="horizontal">
            <Checkbox
              id="voice-consent"
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked)}
              aria-invalid={touched && !consent}
            />
            <FieldLabel
              htmlFor="voice-consent"
              className="leading-5 font-normal"
            >
              {t(
                "The speaker has agreed to have their voice cloned for use on this restaurant's phone line."
              )}
            </FieldLabel>
          </Field>
          {touched && !consent && (
            <FieldError>
              {t("Confirm the speaker's consent to continue.")}
            </FieldError>
          )}
          <Field>
            <FieldLabel htmlFor="voice-consent-reference">
              {t("How was consent recorded?")}
            </FieldLabel>
            <Input
              id="voice-consent-reference"
              value={consentReference}
              onChange={(event) => setConsentReference(event.target.value)}
              placeholder={t(
                "e.g. Ama Mensah, signed consent form on 12 Nov, kept in the staff folder"
              )}
              aria-invalid={touched && !referenceValid}
              maxLength={500}
            />
            <FieldDescription>
              {t("Who agreed, when, and where the record is kept.")}
            </FieldDescription>
            {touched && !referenceValid && (
              <FieldError>{t("Describe who consented and how.")}</FieldError>
            )}
          </Field>
        </div>
      )}

      {step === "record" && (
        <div className="grid gap-6">
          <ul className="grid gap-1.5 text-sm leading-6 text-muted-foreground">
            <li>
              {t("One speaker only, with no music or other voices nearby.")}
            </li>
            <li>{t("Speak at a normal pace in natural sentences.")}</li>
            <li>
              {t(
                "Introduce yourself, describe a typical working day, and read a few menu items."
              )}
            </li>
            <li>{t("Re-record rather than trim a take that went wrong.")}</li>
          </ul>

          {!recordingSupported() ? (
            <p
              className="flex items-start gap-2 text-sm text-destructive"
              role="alert"
            >
              <WarningCircleIcon
                className="mt-0.5 size-4 shrink-0"
                aria-hidden
              />
              {t(
                "This browser cannot record audio. Open the dashboard in a current version of Chrome, Edge, or Safari."
              )}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-lg bg-muted/50 px-4 py-6">
              <p
                className="font-mono text-3xl font-semibold tabular-nums"
                aria-live="off"
              >
                {formatDuration(seconds)}
              </p>
              <div
                className="h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-muted"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-75 motion-reduce:transition-none"
                  style={{ width: `${Math.round(recorder.level * 100)}%` }}
                />
              </div>
              {recording ? (
                <Button size="lg" variant="destructive" onClick={recorder.stop}>
                  <StopIcon weight="fill" aria-hidden />
                  {t("Stop recording")}
                </Button>
              ) : (
                <Button
                  size="lg"
                  disabled={
                    takes.length >= MAX_TAKES || recorder.state === "requesting"
                  }
                  onClick={() => void recorder.start()}
                >
                  <MicrophoneIcon aria-hidden />
                  {t(takes.length ? "Record another take" : "Start recording")}
                </Button>
              )}
              <p
                className="text-center text-xs leading-5 text-muted-foreground"
                role="status"
              >
                {recorder.state === "denied"
                  ? t(
                      "Allow microphone access in your browser, then try again."
                    )
                  : seconds < MIN_SECONDS
                    ? t(
                        "Record at least 20 seconds. About a minute gives the best result."
                      )
                    : seconds < GOOD_SECONDS
                      ? t(
                          "Enough to continue. A minute or more sounds more natural."
                        )
                      : t("Great length. You can continue.")}
              </p>
            </div>
          )}

          {takes.length > 0 && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t("Takes")} {takes.length}/{MAX_TAKES}
                </span>
                <span
                  className={
                    totalBytes(takes) > MAX_TOTAL_BYTES
                      ? "text-destructive"
                      : ""
                  }
                >
                  {formatMegabytes(totalBytes(takes))} /{" "}
                  {formatMegabytes(MAX_TOTAL_BYTES)}
                </span>
              </div>
              <ul className="divide-y divide-border rounded-lg border">
                {takes.map((take, index) => (
                  <li
                    key={take.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <span className="w-16 shrink-0 text-sm font-medium">
                      {t("Take")} {index + 1}
                    </span>
                    <audio
                      controls
                      src={take.url}
                      className="h-9 min-w-0 flex-1"
                      aria-label={`${t("Take")} ${index + 1}`}
                    />
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDuration(take.seconds)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${t("Delete take")} ${index + 1}`}
                      onClick={() => removeTake(take.id)}
                    >
                      <TrashIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {touched && problem && <FieldError>{t(problem)}</FieldError>}
        </div>
      )}

      {(step === "name" || step === "submitting") && (
        <div className="grid gap-6">
          <Field>
            <FieldLabel htmlFor="voice-name">{t("Voice name")}</FieldLabel>
            <Input
              id="voice-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder={t("e.g. Mama Ama")}
              disabled={submitting}
              aria-invalid={touched && !nameValid}
            />
            {touched && !nameValid && (
              <FieldError>{t("Give the voice a name.")}</FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="voice-description">
              {t("Description (optional)")}
            </FieldLabel>
            <Textarea
              id="voice-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={500}
              disabled={submitting}
            />
          </Field>
          <Field orientation="horizontal" className="justify-between">
            <FieldLabel htmlFor="voice-denoise" className="font-normal">
              {t("Reduce background noise")}
            </FieldLabel>
            <Switch
              id="voice-denoise"
              checked={denoise}
              onCheckedChange={setDenoise}
              disabled={submitting}
            />
          </Field>
          {submitting && (
            <div className="grid gap-2" role="status" aria-live="polite">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  progress < 1
                    ? "Uploading recordings…"
                    : "Creating the voice. This can take up to 2 minutes."
                )}
              </p>
            </div>
          )}
          {error && (
            <p
              className="flex items-start gap-2 text-sm text-destructive"
              role="alert"
            >
              <WarningCircleIcon
                className="mt-0.5 size-4 shrink-0"
                aria-hidden
              />
              {t(error)}
            </p>
          )}
        </div>
      )}

      {step === "result" && created && meta && (
        <div className="flex flex-col items-center py-6 text-center">
          <span
            aria-hidden
            className={`mb-5 flex size-14 items-center justify-center rounded-full [&_svg]:size-7 ${
              meta.usable
                ? "bg-success text-success-foreground"
                : "bg-warning text-warning-foreground"
            }`}
          >
            {meta.usable ? <CheckCircleIcon /> : <WarningCircleIcon />}
          </span>
          <p className="text-base font-semibold">{created.name}</p>
          <div className="mt-2">
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            {t(
              meta.usable
                ? "The voice is ready. Use it on the phone agent, then play a sample to hear it."
                : created.status === "verification_required"
                  ? "The voice provider needs to verify this voice before it can be used. Contact support, and use Check status later to see if it is ready."
                  : "This voice cannot be used yet. Check its status in the library."
            )}
          </p>
        </div>
      )}
    </MenuDialog>
  )
}
