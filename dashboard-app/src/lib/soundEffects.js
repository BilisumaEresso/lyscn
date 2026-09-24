/**
 * Web Audio Synthesizer Engine for LayoScan Dashboard
 * Generates pure harmonic acoustic chimes without external audio files.
 * Works offline, 0ms latency, zero 404s.
 */

let sharedAudioCtx = null;
let isAudioUnlocked = false;

function getAudioContext() {
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Automatically unlocks audio playback on the first user interaction.
 * Call this once in AppShell or main.
 */
export function initAudioUnlock() {
  if (typeof window === 'undefined' || isAudioUnlocked) return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx) {
      ctx.resume().then(() => {
        isAudioUnlocked = true;
      }).catch(() => {});
    }
    window.removeEventListener('click', unlock, true);
    window.removeEventListener('keydown', unlock, true);
    window.removeEventListener('touchstart', unlock, true);
  };

  window.addEventListener('click', unlock, true);
  window.addEventListener('keydown', unlock, true);
  window.addEventListener('touchstart', unlock, true);
}

/**
 * Internal tone generator helper
 */
function playToneSequence(tones, masterVolume = 0.7) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseVol = Math.max(0.01, Math.min(1, masterVolume)) * 0.22;
    const now = ctx.currentTime;

    tones.forEach(({ freq, start, duration, type = 'sine', gain = 1 }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);

      const toneGain = baseVol * gain;
      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.linearRampToValueAtTime(toneGain, now + start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    });
  } catch {
    // Graceful fallback for environments blocking audio
  }
}

/**
 * 1. New Order Placed — Melodic, noticeable, pleasant 2-tone chime
 */
export function playOrderChime(volume = 0.7) {
  playToneSequence([
    { freq: 880, start: 0, duration: 0.16, type: 'sine', gain: 1 },     // A5
    { freq: 1108, start: 0.16, duration: 0.28, type: 'sine', gain: 1.1 }, // C#6
  ], volume);
}

/**
 * 2. Guest Assistance / Call Staff — Attention-grabbing double pulse ding
 */
export function playAssistanceBeep(volume = 0.7) {
  playToneSequence([
    { freq: 659.25, start: 0, duration: 0.18, type: 'triangle', gain: 1.1 }, // E5
    { freq: 880, start: 0.14, duration: 0.32, type: 'sine', gain: 1.2 },     // A5
  ], volume);
}

/**
 * 3. Food Ready for Pickup — Bright upward tri-tone fanfare
 */
export function playFoodReadyFanfare(volume = 0.7) {
  playToneSequence([
    { freq: 523.25, start: 0, duration: 0.12, type: 'sine', gain: 0.9 },   // C5
    { freq: 659.25, start: 0.11, duration: 0.14, type: 'sine', gain: 1.0 }, // E5
    { freq: 783.99, start: 0.22, duration: 0.32, type: 'sine', gain: 1.2 }, // G5
  ], volume);
}

/**
 * 4. Table Occupied — Warm, gentle presence tone
 */
export function playTableOccupiedTone(volume = 0.7) {
  playToneSequence([
    { freq: 440, start: 0, duration: 0.15, type: 'sine', gain: 0.65 },    // A4
    { freq: 554.37, start: 0.14, duration: 0.26, type: 'sine', gain: 0.75 }, // C#5
  ], volume);
}

/**
 * 5. Table Ready to Clear — Crisp double bussing tone
 */
export function playTableClearTone(volume = 0.7) {
  playToneSequence([
    { freq: 587.33, start: 0, duration: 0.14, type: 'sine', gain: 0.8 }, // D5
    { freq: 739.99, start: 0.12, duration: 0.25, type: 'sine', gain: 0.9 }, // F#5
  ], volume);
}

/**
 * 6. Order Cancelled — Descending warning tone
 */
export function playOrderCancelledTone(volume = 0.7) {
  playToneSequence([
    { freq: 622.25, start: 0, duration: 0.18, type: 'triangle', gain: 1.0 }, // D#5
    { freq: 415.3, start: 0.16, duration: 0.32, type: 'triangle', gain: 0.9 },  // G#4
  ], volume);
}

/**
 * Test player for previewing sounds in Settings
 */
export function playSoundByType(type, volume = 0.7) {
  switch (type) {
    case 'order_created':
      playOrderChime(volume);
      break;
    case 'assistance':
      playAssistanceBeep(volume);
      break;
    case 'order_ready':
      playFoodReadyFanfare(volume);
      break;
    case 'table_occupied':
      playTableOccupiedTone(volume);
      break;
    case 'table_ready_to_clear':
      playTableClearTone(volume);
      break;
    case 'order_cancelled':
      playOrderCancelledTone(volume);
      break;
    default:
      playOrderChime(volume);
  }
}
