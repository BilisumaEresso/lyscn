/**
 * Customer Web Audio Synthesizer & Haptics Engine
 *
 * Generates pleasant, acoustic-style dining harmonic chimes directly
 * using the Web Audio API with zero external audio assets.
 * Also integrates tactile haptic vibrations for mobile devices.
 */

let audioCtx = null;
let isUnlocked = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

/**
 * Browsers block audio playback until the user interacts with the page.
 * Attaches a one-time gesture listener to unlock the AudioContext seamlessly.
 */
export function initCustomerAudioUnlock() {
  if (typeof window === 'undefined' || isUnlocked) return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        isUnlocked = true;
      }).catch(() => {});
    } else if (ctx && ctx.state === 'running') {
      isUnlocked = true;
    }
    window.removeEventListener('click', unlock, true);
    window.removeEventListener('touchstart', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };

  window.addEventListener('click', unlock, true);
  window.addEventListener('touchstart', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

/**
 * Synthesizes a pure harmonic tone sequence.
 * @param {Array<{freq: number, start: number, duration: number, type?: OscillatorType, gain?: number}>} notes
 * @param {number} masterVolume 0.0 to 1.0 (default 0.3 for pleasant customer ambiance)
 */
function playToneSequence(notes, masterVolume = 0.28) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(1.0, masterVolume)), now);
    masterGain.connect(ctx.destination);

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = note.type || 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      // Smooth attack & exponential decay envelope for acoustic feel
      const noteStartTime = now + note.start;
      const noteEndTime = noteStartTime + note.duration;
      const peakGain = note.gain !== undefined ? note.gain : 0.6;

      noteGain.gain.setValueAtTime(0.0001, noteStartTime);
      noteGain.gain.exponentialRampToValueAtTime(peakGain, noteStartTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(noteStartTime);
      osc.stop(noteEndTime + 0.05);
    });
  } catch (err) {
    console.debug('[Audio] Could not synthesize customer tone:', err);
  }
}

/**
 * Mobile Haptic Vibration wrapper
 */
export function triggerHaptic(pattern) {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptics not allowed or supported
    }
  }
}

// ── Customer Sound Profiles ──────────────────────────────────────────────────

/**
 * Kitchen Confirmed / Accepted:
 * Soft ascending bell (C5 -> E5)
 */
export function playOrderAccepted(volume = 0.28) {
  playToneSequence([
    { freq: 523.25, start: 0, duration: 0.35, type: 'sine', gain: 0.5 },
    { freq: 659.25, start: 0.12, duration: 0.5, type: 'triangle', gain: 0.6 },
  ], volume);
  triggerHaptic([80]);
}

/**
 * Food Being Prepared:
 * Warm gentle presence tone (A4 -> C#5)
 */
export function playOrderPreparing(volume = 0.28) {
  playToneSequence([
    { freq: 440.0, start: 0, duration: 0.3, type: 'sine', gain: 0.4 },
    { freq: 554.37, start: 0.1, duration: 0.4, type: 'sine', gain: 0.5 },
  ], volume);
  triggerHaptic([60]);
}

/**
 * Food Ready / Delivering:
 * Bright celebratory fanfare (D5 -> F#5 -> A5)
 */
export function playFoodReady(volume = 0.32) {
  playToneSequence([
    { freq: 587.33, start: 0, duration: 0.25, type: 'triangle', gain: 0.6 },
    { freq: 739.99, start: 0.12, duration: 0.25, type: 'triangle', gain: 0.6 },
    { freq: 880.0, start: 0.24, duration: 0.7, type: 'sine', gain: 0.8 },
  ], volume);
  triggerHaptic([120, 80, 120, 80, 200]);
}

/**
 * Order Served:
 * Sweet warm resolution chord (E5 -> C6)
 */
export function playOrderServed(volume = 0.28) {
  playToneSequence([
    { freq: 659.25, start: 0, duration: 0.3, type: 'sine', gain: 0.5 },
    { freq: 1046.5, start: 0.15, duration: 0.6, type: 'sine', gain: 0.6 },
  ], volume);
  triggerHaptic([150, 100, 150]);
}

/**
 * Waiter Acknowledged / On the way:
 * Friendly double polite bell (G5 -> C6)
 */
export function playWaiterComing(volume = 0.3) {
  playToneSequence([
    { freq: 783.99, start: 0, duration: 0.2, type: 'sine', gain: 0.5 },
    { freq: 1046.5, start: 0.15, duration: 0.5, type: 'triangle', gain: 0.7 },
  ], volume);
  triggerHaptic([100, 60, 100]);
}

/**
 * Payment Complete:
 * Joyful C-major chime
 */
export function playPaymentReceived(volume = 0.28) {
  playToneSequence([
    { freq: 523.25, start: 0, duration: 0.2, type: 'sine', gain: 0.4 },
    { freq: 659.25, start: 0.08, duration: 0.2, type: 'sine', gain: 0.4 },
    { freq: 783.99, start: 0.16, duration: 0.25, type: 'sine', gain: 0.5 },
    { freq: 1046.5, start: 0.24, duration: 0.6, type: 'triangle', gain: 0.7 },
  ], volume);
  triggerHaptic([100, 80, 200]);
}

/**
 * Order / Item Cancelled:
 * Soft low alert tone
 */
export function playOrderCancelled(volume = 0.28) {
  playToneSequence([
    { freq: 440.0, start: 0, duration: 0.3, type: 'sine', gain: 0.5 },
    { freq: 329.63, start: 0.15, duration: 0.5, type: 'triangle', gain: 0.5 },
  ], volume);
  triggerHaptic([200, 100, 200]);
}
