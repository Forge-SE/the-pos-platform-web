import { useCallback, useEffect, useRef, useState } from "react"

import type { Take } from "@/features/voice/model"

export type RecorderState = "idle" | "requesting" | "recording" | "denied"

/** Each take is capped so one take can never exceed the server's duration limit. */
const MAX_TAKE_SECONDS = 300

function preferredType() {
  if (typeof MediaRecorder === "undefined") return undefined
  // Chrome/Edge record webm/opus, Safari records mp4; the voice service accepts both.
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
    MediaRecorder.isTypeSupported(type)
  )
}

export function recordingSupported() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    "mediaDevices" in navigator &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  )
}

/**
 * Microphone capture with a running timer and an input level (0–1) for the meter.
 * Takes are kept as blobs in memory only; nothing is stored or sent until submit.
 */
export function useVoiceRecorder(onTake: (take: Take) => void) {
  const [state, setState] = useState<RecorderState>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const frame = useRef<number | null>(null)
  const startedAt = useRef(0)
  const onTakeRef = useRef(onTake)
  onTakeRef.current = onTake

  const release = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    void audioContext.current?.close().catch(() => undefined)
    audioContext.current = null
    setLevel(0)
  }, [])

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop()
  }, [])

  const start = useCallback(async () => {
    if (!recordingSupported() || recorder.current?.state === "recording") return
    setState("requesting")
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false },
      })
      stream.current = media
      const type = preferredType()
      const next = new MediaRecorder(media, type ? { mimeType: type } : {})
      const chunks: Blob[] = []
      next.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      next.onstop = () => {
        const seconds = (performance.now() - startedAt.current) / 1000
        const blob = new Blob(chunks, {
          type: next.mimeType || type || "audio/webm",
        })
        release()
        recorder.current = null
        setState("idle")
        setElapsed(0)
        if (blob.size > 0)
          onTakeRef.current({
            id: crypto.randomUUID(),
            blob,
            seconds,
            url: URL.createObjectURL(blob),
          })
      }
      recorder.current = next

      const context = new AudioContext()
      audioContext.current = context
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      context.createMediaStreamSource(media).connect(analyser)
      const samples = new Uint8Array(analyser.fftSize)
      const tick = () => {
        analyser.getByteTimeDomainData(samples)
        let peak = 0
        for (const sample of samples)
          peak = Math.max(peak, Math.abs(sample - 128))
        setLevel(Math.min(1, peak / 64))
        const seconds = (performance.now() - startedAt.current) / 1000
        setElapsed(seconds)
        if (seconds >= MAX_TAKE_SECONDS) next.stop()
        frame.current = requestAnimationFrame(tick)
      }

      startedAt.current = performance.now()
      next.start(1000)
      setState("recording")
      frame.current = requestAnimationFrame(tick)
    } catch {
      release()
      recorder.current = null
      setState("denied")
    }
  }, [release])

  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null
        recorder.current.stop()
      }
      release()
    },
    [release]
  )

  return { state, elapsed, level, start, stop }
}
