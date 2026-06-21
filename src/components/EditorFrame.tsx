import React, { useState, useCallback } from 'react';
import { useEditorSync } from '../hooks/useEditorSync';
import { Toolbar } from './Toolbar';
import { Editor } from './Editor';
import type { ActionLogEntry } from '../types';
import { MAX_LOG_ENTRIES } from '../constants';
import { ActionLog } from './ActionLog';
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react';

interface EditorFrameProps {
  selfId: string;
}

export const EditorFrame: React.FC<EditorFrameProps> = ({ selfId }) => {
  const [logs, setLogs] = useState<ActionLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const handleLogEntry = useCallback((entry: ActionLogEntry) => {
    setLogs((prev) => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
  }, []);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const {
    editorRef,
    activeFormats,
    executeFormat,
    executeUndo,
    executeRedo,
    isTyping,
    peerIsTyping,
    isConnected,
    syncStatus,
  } = useEditorSync({
    selfId,
    onLogEntry: handleLogEntry,
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800/80 rounded-2xl p-4 overflow-hidden shadow-2xl glass-panel">
      {/* Client Iframe header banner */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800/70 select-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.65)]" />
          <h2 className="font-bold text-slate-100 tracking-wider text-xs uppercase">
            Client Editor: {selfId === 'frame-a' ? 'Frame A' : 'Frame B'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isTyping && (
            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-0.5 rounded-full animate-pulse">
              Typing...
            </span>
          )}
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800/80 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <Terminal size={12} />
            Telemetry
            {showLogs ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        </div>
      </div>

      {/* Editor component setup */}
      <div className="flex flex-col flex-grow min-h-0">
        <Toolbar
          activeFormats={activeFormats}
          onExecuteFormat={executeFormat}
          onExecuteUndo={executeUndo}
          onExecuteRedo={executeRedo}
          isConnected={isConnected}
          syncStatus={syncStatus}
        />
        <Editor
          editorRef={editorRef}
          onExecuteFormat={executeFormat}
          onExecuteUndo={executeUndo}
          onExecuteRedo={executeRedo}
          peerIsTyping={peerIsTyping}
          onCaretOrContentChange={() => {}}
        />
      </div>

      {/* Local debugging logs */}
      {showLogs && (
        <div className="mt-4 border-t border-slate-800/70 pt-4 h-[200px] shrink-0">
          <ActionLog logs={logs} onClear={handleClearLogs} />
        </div>
      )}
    </div>
  );
};
