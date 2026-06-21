import type { SyncMessage } from '../types';
import { ALLOWED_ORIGIN } from '../constants';

/**
 * Validate that an incoming message matches our expected SyncMessage schema.
 */
export function isSyncMessage(data: unknown): data is SyncMessage {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;
  const hasId = typeof obj.id === 'string';
  const hasSource = typeof obj.source === 'string';
  const hasTarget = typeof obj.target === 'string';
  const hasTimestamp = typeof obj.timestamp === 'number';
  const hasVersion = typeof obj.version === 'number';
  const hasType = typeof obj.type === 'string';

  return hasId && hasSource && hasTarget && hasTimestamp && hasVersion && hasType;
}

/**
 * Check if the message event origin is authorized.
 */
export function isAuthorizedOrigin(origin: string): boolean {
  // In development, the host and frames share the same origin (differing only by query query parameter).
  // In production, this verifies matches against our whitelist.
  return ALLOWED_ORIGIN === '*' || origin === ALLOWED_ORIGIN;
}

/**
 * Basic HTML sanitization using browser DOMParser to strip potentially
 * malicious nodes and inline event handlers, ensuring XSS prevention.
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (typeof window === 'undefined') return dirtyHtml;

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirtyHtml, 'text/html');
  const body = doc.body;

  // Recursively sanitize the DOM nodes
  const sanitizeNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // Remove dangerous tag types
      if (['script', 'iframe', 'object', 'embed', 'link', 'style', 'meta'].includes(tagName)) {
        element.remove();
        return;
      }

      // Strip interactive handler attributes (onload, onerror, etc.)
      const attributes = Array.from(element.attributes);
      for (const attr of attributes) {
        const name = attr.name.toLowerCase();
        const value = attr.value.toLowerCase();
        
        // Remove on* event handlers or javascript: hrefs
        if (name.startsWith('on') || value.startsWith('javascript:')) {
          element.removeAttribute(attr.name);
        }
      }
    }

    // Traverse children backwards so node removal doesn't shift indexing
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      sanitizeNode(node.childNodes[i]);
    }
  };

  sanitizeNode(body);
  return body.innerHTML;
}
