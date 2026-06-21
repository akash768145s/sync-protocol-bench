import React from 'react';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough as StrikeIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { FormattingState } from '../types';

interface ToolbarProps {
  activeFormats: FormattingState;
  onExecuteFormat: (command: 'bold' | 'italic' | 'strikeThrough') => void;
  onExecuteUndo: () => void;
  onExecuteRedo: () => void;
  isConnected: boolean;
  syncStatus: 'connected' | 'syncing' | 'synced';
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeFormats,
  onExecuteFormat,
  onExecuteUndo,
  onExecuteRedo,
  isConnected,
  syncStatus,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-900/80 border border-slate-700/60 rounded-t-2xl select-none">
      {/* Formatting Tools */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onExecuteFormat('bold')}
          className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
            activeFormats.bold
              ? 'bg-indigo-500/20 border border-indigo-500/80 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
              : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
          title="Bold (Ctrl+B)"
        >
          <BoldIcon size={16} className="stroke-[2.5]" />
        </button>

        <button
          onClick={() => onExecuteFormat('italic')}
          className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
            activeFormats.italic
              ? 'bg-indigo-500/20 border border-indigo-500/80 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
              : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon size={16} className="stroke-[2.5]" />
        </button>

        <button
          onClick={() => onExecuteFormat('strikeThrough')}
          className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
            activeFormats.strikethrough
              ? 'bg-indigo-500/20 border border-indigo-500/80 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
              : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
          title="Strikethrough"
        >
          <StrikeIcon size={16} className="stroke-[2.5]" />
        </button>

        <div className="w-px h-5 mx-1.5 bg-slate-700/60" />

        {/* History / Undos */}
        <button
          onClick={onExecuteUndo}
          className="p-2 rounded-xl border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <UndoIcon size={16} />
        </button>

        <button
          onClick={onExecuteRedo}
          className="p-2 rounded-xl border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          <RedoIcon size={16} />
        </button>
      </div>

      {/* Sync Status Badge details */}
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-medium transition-all ${
            syncStatus === 'syncing'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : syncStatus === 'synced'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              syncStatus === 'syncing'
                ? 'bg-amber-400 animate-ping'
                : syncStatus === 'synced'
                ? 'bg-emerald-400'
                : 'bg-indigo-400'
            }`}
          />
          {syncStatus.toUpperCase()}
        </span>

        <span
          className={`px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-medium ${
            isConnected
              ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {isConnected ? (
            <>
              <Wifi size={12} className="text-indigo-400" />
              LINKED
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-rose-400 animate-pulse" />
              OFFLINE
            </>
          )}
        </span>
      </div>
    </div>
  );
};
