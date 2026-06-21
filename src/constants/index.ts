export const FRAME_IDS = {
  FRAME_A: 'frame-a',
  FRAME_B: 'frame-b',
  HOST: 'host',
} as const;

export const DEBOUNCE_DELAY_MS = 100;
export const TYPING_TIMEOUT_MS = 1500;
export const MAX_LOG_ENTRIES = 50;

// In a real production deployment, this would be restricted to the specific origin of client apps.
// For development and standard local deployment, we allow the current origin dynamically.
export const ALLOWED_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '*';
