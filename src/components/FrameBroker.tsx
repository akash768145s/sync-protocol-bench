import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useIframeComm } from '../hooks/useIframeComm';
import type { SyncMessage, ActionLogEntry } from '../types';
import { ActionLog } from './ActionLog';
import { MAX_LOG_ENTRIES } from '../constants';
import { createMessage } from '../services/syncProtocol';
import { Sliders, ShieldAlert } from 'lucide-react';

export const FrameBroker: React.FC = () => {
  const [logs, setLogs] = useState<ActionLogEntry[]>([]);
  const [lag, setLag] = useState<number>(0);
  const [frameAConnected, setFrameAConnected] = useState(false);
  const [frameBConnected, setFrameBConnected] = useState(false);

  const iframeRefA = useRef<HTMLIFrameElement>(null);
  const iframeRefB = useRef<HTMLIFrameElement>(null);

  const sendToFrameRef = useRef<(iframeWindow: Window, message: SyncMessage) => void>(() => {});

  const handleLogEntry = useCallback((entry: ActionLogEntry) => {
    setLogs((prev) => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
  }, []);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  /**
   * Evaluates messages routed from child frame editors.
   */
  const handleMessageReceived = useCallback(
    (message: SyncMessage) => {
      const source = message.source;

      // 1. Track Handshake and Keepalive Ping-Pongs
      if (message.type === 'HANDSHAKE_INIT') {
        if (source === 'frame-a') {
          setFrameAConnected(true);
          const ack = createMessage('host', 'frame-a', 'HANDSHAKE_ACK', null, message.version);
          if (iframeRefA.current?.contentWindow) {
            sendToFrameRef.current(iframeRefA.current.contentWindow, ack);
          }
        } else if (source === 'frame-b') {
          setFrameBConnected(true);
          const ack = createMessage('host', 'frame-b', 'HANDSHAKE_ACK', null, message.version);
          if (iframeRefB.current?.contentWindow) {
            sendToFrameRef.current(iframeRefB.current.contentWindow, ack);
          }
        }
        return;
      }

      if (message.type === 'PING') {
        if (source === 'frame-a') setFrameAConnected(true);
        if (source === 'frame-b') setFrameBConnected(true);

        const pong = createMessage('host', source, 'PONG', null, message.version);
        const targetWindow =
          source === 'frame-a'
            ? iframeRefA.current?.contentWindow
            : iframeRefB.current?.contentWindow;

        if (targetWindow) {
          sendToFrameRef.current(targetWindow, pong);
        }
        return;
      }

      // 2. State synchronization forwarding logic (Frame A <-> Frame B)
      const targetFrame = source === 'frame-a' ? 'frame-b' : 'frame-a';
      const targetIframe = targetFrame === 'frame-a' ? iframeRefA.current : iframeRefB.current;

      if (targetIframe && targetIframe.contentWindow) {
        const relayMessage = {
          ...message,
          target: targetFrame,
        };

        if (lag > 0) {
          // Delay transmission to simulate network lag/latency
          setTimeout(() => {
            if (targetIframe.contentWindow) {
              sendToFrameRef.current(targetIframe.contentWindow, relayMessage);
            }
          }, lag);
        } else {
          sendToFrameRef.current(targetIframe.contentWindow, relayMessage);
        }
      }
    },
    [lag]
  );

  const { sendToFrame } = useIframeComm({
    selfId: 'host',
    onMessageReceived: handleMessageReceived,
    onLogEntry: handleLogEntry,
  });

  useEffect(() => {
    sendToFrameRef.current = sendToFrame;
  }, [sendToFrame]);

  /**
   * Dispatches dirty payload tags to test active XSS/script sanitization features.
   */
  const handleSecurityTest = () => {
    const dirtyHtml = `
      <p>Clean Paragraph text.</p>
      <script>alert("XSS Attack Triggered!")</script>
      <img src="does-not-exist.jpg" onerror="console.warn('Blocked Exploit Event Handler!')" />
      <iframe src="https://example.com"></iframe>
    `;

    const payload = {
      html: dirtyHtml,
      selection: null,
      activeFormats: { bold: false, italic: false, strikethrough: false },
      isTyping: false,
    };

    const messageA = createMessage('host', 'frame-a', 'SYNC_STATE', payload, 9999);
    const messageB = createMessage('host', 'frame-b', 'SYNC_STATE', payload, 9999);

    if (iframeRefA.current?.contentWindow) {
      sendToFrame(iframeRefA.current.contentWindow, messageA);
    }
    if (iframeRefB.current?.contentWindow) {
      sendToFrame(iframeRefB.current.contentWindow, messageB);
    }

    handleLogEntry({
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      direction: 'sent',
      source: 'host',
      target: 'both',
      type: 'SYNC_STATE',
      details: 'SECURITY TEST INJECTION: Sent dirty scripts, iframes, and bad tags to editors.',
      success: true,
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-8 select-none">
      {/* Broker Header Panel controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 glass-panel">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h1 className="text-xl font-bold text-slate-100">Host Message Broker Dashboard</h1>
          </div>
          <p className="text-xs text-slate-400">
            Mediates iframe synchronization events, verifies safety thresholds, and displays real-time telemetry metrics.
          </p>
        </div>

        {/* Network Lag sliders and XSS trigger */}
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-850 px-4 py-2 rounded-2xl">
            <Sliders size={14} className="text-slate-400" />
            <div className="flex flex-col">
              <label className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Lag Simulator</label>
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="100"
                  value={lag}
                  onChange={(e) => setLag(Number(e.target.value))}
                  className="w-24 accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs text-indigo-400 font-mono w-10 text-right">{lag}ms</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSecurityTest}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-2xl text-xs font-semibold transition-all cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.15)]"
          >
            <ShieldAlert size={14} className="text-rose-400 animate-pulse" />
            XSS Injection Test
          </button>
        </div>
      </div>

      {/* Channel indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
            frameAConnected
              ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.05)]'
              : 'bg-slate-900/10 border-slate-850 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${frameAConnected ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>Frame A Broker Socket</span>
          </div>
          <span className="font-semibold text-[10px] tracking-wider">
            {frameAConnected ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>

        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
            frameBConnected
              ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.05)]'
              : 'bg-slate-900/10 border-slate-850 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${frameBConnected ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>Frame B Broker Socket</span>
          </div>
          <span className="font-semibold text-[10px] tracking-wider">
            {frameBConnected ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Frame Editors Iframe wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col h-[480px] rounded-3xl overflow-hidden border border-slate-850 bg-slate-950/20 shadow-2xl">
          <iframe
            ref={iframeRefA}
            src="?mode=frame&id=frame-a"
            title="Frame A Editor"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        <div className="flex flex-col h-[480px] rounded-3xl overflow-hidden border border-slate-850 bg-slate-950/20 shadow-2xl">
          <iframe
            ref={iframeRefB}
            src="?mode=frame&id=frame-b"
            title="Frame B Editor"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>

      {/* Telemetry Logger */}
      <div className="h-[280px]">
        <ActionLog logs={logs} onClear={handleClearLogs} />
      </div>
    </div>
  );
};
