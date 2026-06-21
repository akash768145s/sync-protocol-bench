import { useEffect, useCallback, useRef } from 'react';
import type { SyncMessage, ActionLogEntry } from '../types';
import { isSyncMessage, isAuthorizedOrigin } from '../services/security';
import { ALLOWED_ORIGIN } from '../constants';

interface UseIframeCommProps {
  selfId: string;
  onMessageReceived: (message: SyncMessage) => void;
  onLogEntry?: (entry: ActionLogEntry) => void;
}

export function useIframeComm({ selfId, onMessageReceived, onLogEntry }: UseIframeCommProps) {
  const onMessageReceivedRef = useRef(onMessageReceived);
  const onLogEntryRef = useRef(onLogEntry);

  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
    onLogEntryRef.current = onLogEntry;
  }, [onMessageReceived, onLogEntry]);

  const logAction = useCallback(
    (
      direction: 'sent' | 'received' | 'relayed',
      source: string,
      target: string,
      message: SyncMessage,
      details: string,
      success = true
    ) => {
      if (onLogEntryRef.current) {
        onLogEntryRef.current({
          id: message.id || Math.random().toString(36).substring(7),
          timestamp: Date.now(),
          direction,
          source,
          target,
          type: message.type,
          details,
          success,
        });
      }
    },
    []
  );

  /**
   * Dispatches a message to the parent container (Client Frame -> Host Broker).
   */
  const sendToParent = useCallback(
    (message: SyncMessage) => {
      if (typeof window === 'undefined') return;

      try {
        window.parent.postMessage(message, ALLOWED_ORIGIN);
        logAction('sent', selfId, message.target, message, `Dispatched message to Host parent`);
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logAction(
          'sent',
          selfId,
          message.target,
          message,
          `Failed window.parent.postMessage: ${errorMsg}`,
          false
        );
      }
    },
    [selfId, logAction]
  );

  /**
   * Dispatches a message to a child iframe target (Host Broker -> Client Frame).
   */
  const sendToFrame = useCallback(
    (iframeWindow: Window, message: SyncMessage) => {
      try {
        iframeWindow.postMessage(message, ALLOWED_ORIGIN);
        logAction('relayed', message.source, message.target, message, `Relayed message to target iframe`);
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logAction(
          'relayed',
          message.source,
          message.target,
          message,
          `Failed relay postMessage: ${errorMsg}`,
          false
        );
      }
    },
    [logAction]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 1. Verify source origin security
      if (!isAuthorizedOrigin(event.origin)) {
        console.warn(`[Security Warn] Disallowed message origin: ${event.origin}`);
        return;
      }

      // 2. Structural schema validation check
      if (!isSyncMessage(event.data)) {
        // Discard typical development framework updates (like Vite HMR triggers)
        return;
      }

      const message = event.data;

      // 3. Filter out loops where self is the sender
      if (message.source === selfId) {
        return;
      }

      // 4. Reject message if targeted strictly at a different client frame
      if (message.target !== selfId && message.target !== '*') {
        return;
      }

      logAction('received', message.source, selfId, message, `Received message: ${message.type}`);
      onMessageReceivedRef.current(message);
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [selfId, logAction]);

  return {
    sendToParent,
    sendToFrame,
  };
}
