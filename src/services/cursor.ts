import type { CursorSelection } from '../types';

/**
 * Traverses the DOM tree inside the container to calculate selection character offsets
 * relative to the aggregated text content.
 */
export function getCursorSelection(container: HTMLElement): CursorSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);

  // Check if the selection resides inside our editable target
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }

  let startOffset = 0;
  let endOffset = 0;
  let startFound = false;
  let endFound = false;

  const traverse = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.nodeValue?.length || 0;

      if (!startFound) {
        if (node === range.startContainer) {
          startOffset += range.startOffset;
          startFound = true;
        } else {
          startOffset += len;
        }
      }

      if (!endFound) {
        if (node === range.endContainer) {
          endOffset += range.endOffset;
          endFound = true;
        } else {
          endOffset += len;
        }
      }
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
      }
    }
  };

  traverse(container);

  return {
    startOffset,
    endOffset,
    collapsed: range.collapsed,
  };
}

/**
 * Reconstructs the selection range mapping relative character offsets back to DOM nodes.
 */
export function restoreCursorSelection(container: HTMLElement, cursor: CursorSelection): void {
  const selection = window.getSelection();
  if (!selection) return;

  selection.removeAllRanges();
  const range = document.createRange();

  let currentOffset = 0;
  let startNode: Node | null = null;
  let startNodeOffset = 0;
  let endNode: Node | null = null;
  let endNodeOffset = 0;

  const traverse = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.nodeValue?.length || 0;

      // Detect start node
      if (!startNode && currentOffset + len >= cursor.startOffset) {
        startNode = node;
        startNodeOffset = cursor.startOffset - currentOffset;
      }

      // Detect end node
      if (!endNode && currentOffset + len >= cursor.endOffset) {
        endNode = node;
        endNodeOffset = cursor.endOffset - currentOffset;
      }

      currentOffset += len;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
        if (startNode && endNode) break;
      }
    }
  };

  traverse(container);

  // Fallback: if offsets exceed text limits, anchor selection to the tail node
  if (!startNode) {
    const lastTextNode = findLastTextNode(container);
    if (lastTextNode) {
      startNode = lastTextNode;
      startNodeOffset = lastTextNode.nodeValue?.length || 0;
    } else {
      startNode = container;
      startNodeOffset = container.childNodes.length;
    }
  }

  if (!endNode) {
    endNode = startNode;
    endNodeOffset = startNodeOffset;
  }

  try {
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    selection.addRange(range);
  } catch (error) {
    console.warn('[CursorPreserver] Failed to restore range:', error);
  }
}

/**
 * Recursively locates the final text node inside a DOM tree.
 */
function findLastTextNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return node;
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const found = findLastTextNode(node.childNodes[i]);
    if (found) return found;
  }
  return null;
}
