// ── WEB AUDIO SYNTHESIZED NOTIFICATION SOUNDS ──────────────────────────────────
// Instead of downloading slow MP3/WAV audio files over the network, we use the 
// browser's built-in Web Audio API to synthesize smooth melodic chimes mathematically.
// Benefits: Instant playback (0ms delay), works offline, zero network assets.

let audioCtx: AudioContext | null = null;

// Helper to initialize or resume the shared AudioContext instance
function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    // Modern browsers suspend AudioContext until the user interacts with the page
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// ── USER MUTE PREFERENCES (PERSISTED IN LOCALSTORAGE) ─────────────────────────
export const isSoundEnabled = (): boolean => {
  return localStorage.getItem('crm_notification_sound') !== 'false';
};

export const setSoundEnabled = (enabled: boolean): void => {
  localStorage.setItem('crm_notification_sound', enabled ? 'true' : 'false');
};

// ── PLAY SYNTHESIZED SOUND CHIMES ─────────────────────────────────────────────
// Supports 3 distinct synthesized audio alerts:
// 1. 'default': Soft pleasant bell chord (C5 -> E5 -> G5) for standard notifications
// 2. 'success': Triumphant ascending chime (E5 -> G#5 -> B5) for won deals / signed contracts
// 3. 'alert': 2-tone warning chime (F5 -> A5) for overdue tasks / urgent alerts
export const playNotificationSound = (type: 'default' | 'success' | 'alert' = 'default') => {
  try {
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'alert') {
      // 2-tone attention chime (F5 698Hz -> A5 880Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(698.46, now); // F5
      osc.frequency.setValueAtTime(880.0, now + 0.12); // A5

      gain.gain.setValueAtTime(0.2, now);
      // Exponential decay gives a natural acoustic fade-out
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'success') {
      // Ascending triumphant major triad (E5 -> G#5 -> B5)
      const freqs = [659.25, 830.61, 987.77];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);

        gain.gain.setValueAtTime(0.18, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.35);
      });
    } else {
      // Soft, modern bell chord chime (C5 -> E5 -> G5)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    }
  } catch (err) {
    console.debug('Could not play notification sound:', err);
  }
};
