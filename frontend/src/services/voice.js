/**
 * Optional voice assistance for NeuroMotion (Web Speech Synthesis).
 *
 * Design rules:
 *  - Voice is ALWAYS opt-in: the default state is off, and it is only
 *    remembered after the user explicitly enables it (localStorage).
 *  - No microphone/permissions are involved: speechSynthesis only speaks
 *    (output), so using the app without voice requires nothing.
 *  - Every spoken instruction also exists as visible text (the runner's
 *    coach line, countdown numbers, and completion screen) — voice is a
 *    supplement, never the only channel.
 */

const STORAGE_KEY = 'nm_voice_enabled';

/** True only when the browser exposes speech synthesis with at least one voice. */
export const isVoiceSupported = () => {
  try {
    return typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance === 'function';
  } catch {
    return false;
  }
};

/** Persisted opt-in. Default OFF — voice never starts on its own. */
export const isVoiceEnabled = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setVoiceEnabled = (enabled) => {
  try {
    if (enabled) {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* private-mode etc.: toggle simply won't persist */
  }
  if (!enabled) stopSpeaking();
};

/** Stop any queued/ongoing speech (used on disable, unmount, and session end). */
export const stopSpeaking = () => {
  try {
    if (isVoiceSupported()) window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
};

/** Last message spoken, so rapid repeat calls (e.g. per-frame) are ignored. */
let lastSpoken = '';
let lastSpokenAt = 0;

/**
 * Speak a message if voice is enabled and supported.
 * Deduplicates identical consecutive messages within 3 seconds so callers
 * can invoke it freely. Returns true if speech was actually queued.
 */
export const speak = (message, { force = false } = {}) => {
  if (!message || !isVoiceSupported() || !isVoiceEnabled()) return false;
  const now = Date.now();
  if (!force && message === lastSpoken && now - lastSpokenAt < 3000) return false;
  try {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.95; // slightly slower,calm pace for rehab context
    utterance.lang = document.documentElement?.lang || 'en-US';
    window.speechSynthesis.speak(utterance);
    lastSpoken = message;
    lastSpokenAt = now;
    return true;
  } catch {
    return false;
  }
};
