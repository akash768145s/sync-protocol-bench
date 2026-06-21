import { describe, it, expect, vi } from 'vitest';
import { isSyncMessage, sanitizeHtml } from '../services/security';
import { normalizeHtml, createMessage } from '../services/syncProtocol';
import { getCursorSelection } from '../services/cursor';

describe('Sync Security & Schema Validation', () => {
  it('should validate conforming sync messages', () => {
    const validMessage = createMessage(
      'frame-a',
      'frame-b',
      'SYNC_STATE',
      { html: 'test' },
      1
    );
    expect(isSyncMessage(validMessage)).toBe(true);
  });

  it('should reject malformed sync messages', () => {
    const invalidMessage = {
      source: 'frame-a',
      target: 'frame-b',
      type: 'SYNC_STATE',
      // missing: id, timestamp, version, etc.
    };
    expect(isSyncMessage(invalidMessage)).toBe(false);
  });

  it('should sanitize dangerous HTML payloads', () => {
    const dirty = '<div>text</div><script>alert(1)</script><img src="x" onerror="bad()">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onerror');
    expect(clean).toContain('<div>text</div>');
  });
});

describe('HTML Normalization & Loop Prevention', () => {
  it('should normalize minor whitespace and returns differences', () => {
    const html1 = '<p>hello world</p>\n';
    const html2 = ' <p>hello  world</p> &nbsp; ';

    expect(normalizeHtml(html1)).toBe('<p>hello world</p>');
    expect(normalizeHtml(html2)).toBe('<p>hello world</p>');
  });
});

describe('Cursor Offset Preservation', () => {
  it('should map character offset inside nested formatting tags', () => {
    // Setup mock elements inside container
    const container = document.createElement('div');
    container.innerHTML = 'hello <b>world</b>';
    document.body.appendChild(container);

    const bTag = container.querySelector('b')!;
    const textNode = bTag.firstChild!;

    // Mock DOM range selection
    const range = {
      startContainer: textNode,
      startOffset: 1, // 'w[o]rld' -> global index = 6 ('hello ') + 1 ('w') = 7
      endContainer: textNode,
      endOffset: 4,   // 'wor[l]d' -> global index = 6 + 4 = 10
      collapsed: false,
    };

    // Mock window selection APIs
    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => range,
    };

    vi.stubGlobal('window', {
      getSelection: () => mockSelection,
    });

    const selectionOffsets = getCursorSelection(container);
    expect(selectionOffsets).not.toBeNull();
    expect(selectionOffsets?.startOffset).toBe(7);
    expect(selectionOffsets?.endOffset).toBe(10);

    // Cleanup mock element
    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });
});
