import { useState, useCallback, useRef, useEffect } from 'react';
import { useIframeComm } from './useIframeComm';
import { useRichText } from './useRichText';
import type { SyncMessage, SyncStatePayload, ActionLogEntry } from '../types';
import { createMessage, normalizeHtml } from '../services/syncProtocol';
import { sanitizeHtml } from '../services/security';
import { getCursorSelection, restoreCursorSelection } from '../services/cursor';
import { DEBOUNCE_DELAY_MS, TYPING_TIMEOUT_MS } from '../constants';

interface UseEditorSyncProps {
  selfId: string;
  onLogEntry: (entry: ActionLogEntry) => void;
}

export function useEditorSync({ selfId, onLogEntry }: UseEditorSyncProps) {
  // 1. Declare Refs first to avoid Temporal Dead Zone (TDZ)
  const versionRef = useRef(0);
  const isApplyingIncomingSync = useRef(false);
  const debounceTimeoutRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const sendToParentRef = useRef<(message: SyncMessage) => void>(() => {});

  // 2. Declare States
  const [isTyping, setIsTyping] = useState(false);
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'synced'>('connected');

  /**
   * Encapsulates state serializing and transmits it to parent host.
   */
  const broadcastState = useCallback(
    (typingState: boolean) => {
      const el = editorRef.current;
      if (!el) return;

      const html = el.innerHTML;
      const selection = getCursorSelection(el);

      const payload: SyncStatePayload = {
        html,
        selection,
        activeFormats: {
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          strikethrough: document.queryCommandState('strikeThrough'),
        },
        isTyping: typingState,
      };

      const message = createMessage(
        selfId,
        '*', // Broadcast target (Broker will resolve and forward to matching peers)
        'SYNC_STATE',
        payload,
        versionRef.current
      );

      sendToParentRef.current(message);
    },
    [selfId, editorRef]
  );

  /**
   * Callback fired by local editor changes (typing/keystrokes).
   * Unused parameters are prefixed with underscores to satisfy ESLint rules.
   */
  const handleContentChange = useCallback(
    () => {
      if (isApplyingIncomingSync.current) return;

      // Increment local state revision version
      versionRef.current += 1;
      setSyncStatus('syncing');

      // Refresh typing status indicators
      setIsTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        setIsTyping(false);
        broadcastState(false);
      }, TYPING_TIMEOUT_MS);

      // Debounce the content relay to prevent network flooding
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = window.setTimeout(() => {
        broadcastState(true);
        setSyncStatus('synced');
      }, DEBOUNCE_DELAY_MS);
    },
    [broadcastState]
  );

  // 3. Mount hooks using declared elements
  const {
    activeFormats,
    updateActiveFormats,
    executeFormat,
    executeUndo,
    executeRedo,
    focusEditor,
  } = useRichText(editorRef, handleContentChange);

  /**
   * Evaluates and updates local editor state from incoming broker signals.
   */
  const handleMessageReceived = useCallback(
    (message: SyncMessage) => {
      if (message.type === 'SYNC_STATE') {
        const payload = message.payload as SyncStatePayload;

        // 1. logical clock check to ignore stale/out-of-order items
        if (message.version < versionRef.current) {
          return;
        }

        // Synchronize version clock
        versionRef.current = message.version;
        setPeerIsTyping(payload.isTyping);

        const el = editorRef.current;
        if (!el) return;

        const currentHtmlNormalized = normalizeHtml(el.innerHTML);
        const incomingHtmlNormalized = normalizeHtml(payload.html);

        // 2. Loop Prevention: skip updating if content is identical
        if (currentHtmlNormalized === incomingHtmlNormalized) {
          // Just sync cursor position if peer is actively focused
          if (payload.selection && document.activeElement !== el) {
            isApplyingIncomingSync.current = true;
            restoreCursorSelection(el, payload.selection);
            isApplyingIncomingSync.current = false;
          }
          return;
        }

        // 3. Perform DOM write under synchronization lock
        isApplyingIncomingSync.current = true;
        setSyncStatus('syncing');

        // Sanitize markup for secure injections
        const sanitized = sanitizeHtml(payload.html);
        el.innerHTML = sanitized;

        // Restore Caret/Cursor positions mapping relative character offset
        if (payload.selection) {
          restoreCursorSelection(el, payload.selection);
        }

        updateActiveFormats();

        // Use a timeout/microtask to release lock and complete render
        setTimeout(() => {
          isApplyingIncomingSync.current = false;
          setSyncStatus('synced');
        }, 0);
      } else if (message.type === 'PING') {
        // Respond to ping keepalives
        const pong = createMessage(selfId, message.source, 'PONG', null, versionRef.current);
        sendToParentRef.current(pong);
        setIsConnected(true);
      } else if (message.type === 'PONG') {
        setIsConnected(true);
      } else if (message.type === 'HANDSHAKE_ACK') {
        setIsConnected(true);
        broadcastState(isTyping);
      }
    },
    [selfId, editorRef, updateActiveFormats, isTyping, broadcastState]
  );

  const { sendToParent } = useIframeComm({
    selfId,
    onMessageReceived: handleMessageReceived,
    onLogEntry,
  });

  // Assign the ref to sendToParent to prevent cycles and handle hook updates
  useEffect(() => {
    sendToParentRef.current = sendToParent;
  }, [sendToParent]);

  // Monitor document-level selection shifts inside iframe
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleSelectionChange = () => {
      // Ignore modifications triggered by incoming updates
      if (isApplyingIncomingSync.current) return;

      updateActiveFormats();

      const el = editorRef.current;

      // Only transmit cursor alignment if editor holds active focus
      if (el && document.activeElement === el) {
        const selection = getCursorSelection(el);
        if (selection) {
          const payload: SyncStatePayload = {
            html: el.innerHTML,
            selection,
            activeFormats: {
              bold: document.queryCommandState('bold'),
              italic: document.queryCommandState('italic'),
              strikethrough: document.queryCommandState('strikeThrough'),
            },
            isTyping: isTyping,
          };

          const message = createMessage(
            selfId,
            '*',
            'SYNC_STATE',
            payload,
            versionRef.current
          );
          sendToParentRef.current(message);
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [selfId, updateActiveFormats, isTyping, editorRef]);

  // Initial handshake triggers on mount
  useEffect(() => {
    const handshake = createMessage(selfId, 'host', 'HANDSHAKE_INIT', null, 0);
    sendToParentRef.current(handshake);

    // Routine keepalive interval
    const keepalive = setInterval(() => {
      const ping = createMessage(selfId, 'host', 'PING', null, versionRef.current);
      sendToParentRef.current(ping);
    }, 4000);

    return () => {
      clearInterval(keepalive);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selfId]);

  return {
    editorRef,
    activeFormats,
    executeFormat,
    executeUndo,
    executeRedo,
    isTyping,
    peerIsTyping,
    isConnected,
    syncStatus,
    focusEditor,
  };
}
