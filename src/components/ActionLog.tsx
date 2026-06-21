import React, { useState } from 'react';
import type { ActionLogEntry } from '../types';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Trash2, Shield, Radio } from 'lucide-react';

interface ActionLogProps {
  logs: ActionLogEntry[];
  onClear: () => void;
}

export const ActionLog: React.FC<ActionLogProps> = ({ logs, onClear }) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'all') return true;
    if (filterType === 'security') return !log.success;
    if (filterType === 'sync') return log.type === 'SYNC_STATE';
    if (filterType === 'handshake') {
      return (
        log.type.startsWith('HANDSHAKE') ||
        log.type === 'PING' ||
        log.type === 'PONG'
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-hidden glass-panel">
      {/* Logger Toolbar header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 select-none">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-indigo-400 animate-pulse animate-duration-3000" />
          <h3 className="font-semibold text-sm text-slate-200">System Telemetry Log</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-slate-800 text-slate-300 border border-slate-700/60 rounded px-2.5 py-1 outline-none cursor-pointer focus:border-indigo-500/70"
          >
            <option value="all">All Events</option>
            <option value="sync">Sync Events</option>
            <option value="handshake">Handshakes</option>
            <option value="security">Errors/Blocked</option>
          </select>
          <button
            onClick={onClear}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Clear logs"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Log feed stack */}
      <div className="flex-1 overflow-y-auto p-3.5 font-mono text-[11px] leading-relaxed space-y-2 max-h-[380px]">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-xs select-none">
            <Radio size={24} className="text-slate-700 mb-2 stroke-[1.5]" />
            No telemetry records
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
              hour12: false,
              fractionalSecondDigits: 3,
            } as Intl.DateTimeFormatOptions);

            let dirIcon = <RefreshCw size={10} />;
            let dirColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';

            if (log.direction === 'sent') {
              dirIcon = <ArrowUpRight size={10} />;
              dirColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
            } else if (log.direction === 'received') {
              dirIcon = <ArrowDownLeft size={10} />;
              dirColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            }

            if (!log.success) {
              dirIcon = <Shield size={10} />;
              dirColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            }

            return (
              <div
                key={log.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  log.success
                    ? 'bg-slate-900/35 border-slate-850/60 hover:bg-slate-900/60'
                    : 'bg-rose-950/15 border-rose-900/30 hover:bg-rose-950/25'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[9px] font-bold flex items-center gap-0.5 ${dirColor}`}
                    >
                      {dirIcon}
                      {log.direction.toUpperCase()}
                    </span>
                    <span className="font-semibold text-indigo-300">{log.type}</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">{timeStr}</span>
                </div>
                <div className="text-slate-400 truncate mb-1 text-[10px]">
                  <span className="text-slate-500">Source:</span>{' '}
                  <span className="text-slate-300">{log.source}</span>{' '}
                  <span className="text-slate-500">Target:</span>{' '}
                  <span className="text-slate-300">{log.target}</span>
                </div>
                <div className={`break-words ${log.success ? 'text-slate-300' : 'text-rose-300 font-medium'}`}>
                  {log.details}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
