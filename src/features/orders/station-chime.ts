const ALARM_AUDIO_URL = "/universfield-digital-alarm-clock-151927.mp3"
const ALARM_DURATION_MS = 3000
let audio: HTMLAudioElement | null = null
let stopTimer: ReturnType<typeof setTimeout> | undefined

export function unlockStationChime() {
  if (typeof Audio === "undefined") return null
  audio ??= new Audio(ALARM_AUDIO_URL)
  audio.preload = "auto"
  return audio
}

export function stopStationChime() {
  if (stopTimer !== undefined) clearTimeout(stopTimer)
  stopTimer = undefined
  if (audio) {
    audio.pause()
    audio.currentTime = 0
  }
}

export function playStationChime() {
  const current = unlockStationChime()
  if (!current) return
  stopStationChime()
  current.loop = false
  // Start during the alarm button's user gesture to unlock later alerts.
  void current.play().catch(() => undefined)
  stopTimer = setTimeout(stopStationChime, ALARM_DURATION_MS)
}
