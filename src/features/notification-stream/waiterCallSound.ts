let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  if (!audioContext) audioContext = new AudioContextCtor()
  return audioContext
}

function playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number): void {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = "sine"
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

function playChime(ctx: AudioContext): void {
  const now = ctx.currentTime
  playTone(ctx, 880, now, 0.18)
  playTone(ctx, 1175, now + 0.2, 0.22)
}

/** Plays a short attention chime for an incoming waiter call. */
export function playWaiterCallSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === "suspended") {
    // Scheduling tones before resume() actually completes can silently drop
    // them, and an unawaited rejection (e.g. autoplay policy denies it
    // without a prior user gesture) would surface as an unhandled rejection.
    ctx.resume().then(
      () => playChime(ctx),
      () => {
        // No fallback — the popup still shows silently.
      },
    )
    return
  }
  playChime(ctx)
}
