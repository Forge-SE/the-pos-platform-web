let audio: AudioContext | null = null

function context() {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctx) return null
  audio ??= new Ctx()
  return audio
}

export function unlockStationChime() {
  const current = context()
  if (current?.state === "suspended") void current.resume()
  return current
}

export function playStationChime(kind: "kitchen" | "cashier") {
  const current = context()
  if (!current || current.state !== "running") return
  const now = current.currentTime
  const notes = kind === "kitchen" ? [784, 988] : [523, 659, 784]
  notes.forEach((frequency, index) => {
    const start = now + index * 0.16
    const tone = current.createOscillator()
    const level = current.createGain()
    tone.type = "sine"
    tone.frequency.value = frequency
    level.gain.setValueAtTime(0.0001, start)
    level.gain.exponentialRampToValueAtTime(0.2, start + 0.02)
    level.gain.exponentialRampToValueAtTime(0.0001, start + 0.32)
    tone.connect(level)
    level.connect(current.destination)
    tone.start(start)
    tone.stop(start + 0.34)
  })
}
