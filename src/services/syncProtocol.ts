import type { SyncMessage, MessageType } from '../types';

/**
 * Generates a unique message ID.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers or test environments
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Wraps payload data in a standard SyncMessage protocol envelope.
 */
export function createMessage<T>(
  source: string,
  target: string,
  type: MessageType,
  payload: T,
  version: number
): SyncMessage<T> {
  return {
    id: generateUUID(),
    source,
    target,
    timestamp: Date.now(),
    type,
    version,
    payload,
  };
}

/**
 * Standardizes HTML markup differences (white-spaces, returns, non-breaking spaces)
 * to allow accurate equivalence testing and prevent duplicate messaging.
 */
export function normalizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/\r?\n|\r/g, '') // Remove returns
    .replace(/\s+/g, ' ')     // Merge double spaces
    .replace(/&nbsp;/g, ' ')  // Standardize non-breaking spaces
    .trim();
}
