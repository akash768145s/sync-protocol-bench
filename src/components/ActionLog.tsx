import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ActionLogEntry } from '../types';
import {
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Trash2,
  Shield,
  Radio,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface ActionLogProps {
  logs: ActionLogEntry[];
  onClear: () => void;
}

// 1. Memoized Row Component to optimize list re-renders
const LogRow = React.memo(({
  log,
  isExpanded,
  onToggleExpand,
}: {
  log: ActionLogEntry;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}) => {
  const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
    hour12: false,
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions);

  // Styling maps by Message Type
  let typeStyle = 'bg-slate-800 text-slate-400 border-slate-700/50';
  if (log.type === 'SYNC_STATE') {
    typeStyle = 'bg-sky-500/10 text-sky-400 border-sky-500/25';
  } else if (log.type === 'FORMAT_SYNC') {
    typeStyle = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25';
  } else if (log.type === 'HANDSHAKE_INIT' || log.type === 'HANDSHAKE_ACK') {
    typeStyle = 'bg-teal-500/10 text-teal-300 border-teal-500/25';
  } else if (log.type === 'PING' || log.type === 'PONG') {
    typeStyle = 'bg-slate-800/60 text-slate-500 border-slate-800';
  }

  // Direction indicators
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
    <div className="border-b border-slate-900/60 last:border-0 select-none">
      {/* Row Header - Collapsed View (approx 40px height) */}
      <div
        onClick={() => onToggleExpand(log.id)}
        className={`flex items-center justify-between px-3 py-2 text-[11px] font-mono hover:bg-slate-800/40 transition-colors cursor-pointer ${
          isExpanded ? 'bg-slate-800/30' : 'odd:bg-slate-950/20 even:bg-slate-900/10'
        }`}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Collapse Indicator */}
          <span className="text-slate-600">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>

          {/* Time Column */}
          <span className="text-slate-500 w-16 shrink-0 flex items-center gap-1">
            <Clock size={10} />
            {timeStr}
          </span>

          {/* Direction Column */}
          <div className="w-40 shrink-0 truncate flex items-center gap-1.5 text-slate-400">
            <span className="text-slate-300 font-semibold">{log.source}</span>
            <span className="text-slate-600">→</span>
            <span className="text-slate-300 font-semibold">{log.target}</span>
          </div>

          {/* Event Badge Column */}
          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${typeStyle}`}>
            {log.type}
          </span>

          {/* Short message snippet */}
          <span className="text-slate-400 truncate flex-1 hidden md:inline pr-2">
            {log.details}
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`px-1.5 py-0.5 rounded border text-[8px] font-bold flex items-center gap-0.5 ${dirColor}`}
          >
            {dirIcon}
            {log.direction.toUpperCase()}
          </span>

          <span className="w-16 flex items-center justify-end gap-1 font-semibold text-right">
            {log.success ? (
              <>
                <CheckCircle size={10} className="text-emerald-500" />
                <span className="text-emerald-400/90 text-[10px]">OK</span>
              </>
            ) : (
              <>
                <XCircle size={10} className="text-rose-500 animate-pulse" />
                <span className="text-rose-400/90 text-[10px]">ERR</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Expanded telemetry JSON panel details */}
      {isExpanded && (
        <div className="bg-slate-950/80 border-t border-slate-900 p-3.5 space-y-2 select-text text-[10px] font-mono leading-relaxed">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-500 border-b border-slate-900 pb-2">
            <div>
              <span className="font-semibold text-slate-600">UUID:</span>{' '}
              <span className="text-slate-400">{log.id}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">EPOCH:</span>{' '}
              <span className="text-slate-400">{log.timestamp}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">ROUTE:</span>{' '}
              <span className="text-slate-400">{log.direction.toUpperCase()}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">STATE:</span>{' '}
              <span className={log.success ? 'text-emerald-400' : 'text-rose-400'}>
                {log.success ? 'VALIDATED' : 'DISCARDED/BLOCKED'}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-slate-500 block">Telemetry Details:</span>
            <pre className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-850/80 text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 scrollbar">
              {log.details}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
});

LogRow.displayName = 'LogRow';

export const ActionLog: React.FC<ActionLogProps> = ({ logs, onClear }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleAutoScrollToggle = () => {
    setAutoScroll((prev) => !prev);
  };

  // Filter logs by categories
  const filteredLogs = logs.filter((log) => {
    if (filterType === 'all') return true;
    if (filterType === 'security') return !log.success;
    if (filterType === 'sync') return log.type === 'SYNC_STATE' || log.type === 'FORMAT_SYNC';
    if (filterType === 'handshake') {
      return (
        log.type.startsWith('HANDSHAKE') ||
        log.type === 'PING' ||
        log.type === 'PONG'
      );
    }
    return true;
  });

  // Sort logs by selected chronological ordering
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    return sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
  });

  // Auto-scroll list positioning
  useEffect(() => {
    if (autoScroll && listRef.current) {
      if (sortOrder === 'asc') {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      } else {
        listRef.current.scrollTop = 0;
      }
    }
  }, [logs, autoScroll, sortOrder]);

  return (
    <div className="flex flex-col h-full bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-hidden glass-panel">
      {/* Control panel header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 select-none">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-indigo-400 animate-pulse animate-duration-3000" />
          <h3 className="font-semibold text-xs text-slate-200 uppercase tracking-wider">
            System Console
          </h3>
          <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.5 bg-slate-950 rounded-md border border-slate-900">
            {sortedLogs.length} events
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Auto Scroll Toggle */}
          <button
            onClick={handleAutoScrollToggle}
            className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
              autoScroll
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Auto Scroll to newest items"
          >
            Auto Scroll
          </button>

          {/* Sort Order Toggle */}
          <button
            onClick={toggleSortOrder}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50 hover:bg-slate-750 transition-colors cursor-pointer"
            title={sortOrder === 'desc' ? 'Showing Newest First' : 'Showing Oldest First'}
          >
            <ArrowUpDown size={12} />
          </button>

          <select
            value={filterType}
            onChange={handleFilterChange}
            className="text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60 rounded px-2 py-1 outline-none cursor-pointer focus:border-indigo-500/70"
          >
            <option value="all">All Logs</option>
            <option value="sync">Sync Events</option>
            <option value="handshake">Handshakes</option>
            <option value="security">Errors/Blocked</option>
          </select>

          <button
            onClick={onClear}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Clear console"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Grid columns header (sticky) */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/60 border-b border-slate-900 text-[9px] font-bold text-slate-500 uppercase select-none font-mono">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="w-3 shrink-0" />
          <span className="w-16 shrink-0 flex items-center gap-1">Time</span>
          <span className="w-40 shrink-0">Initiator → Target</span>
          <span className="w-20 shrink-0">Event Type</span>
          <span className="flex-1 hidden md:inline">Action Details</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="w-14 shrink-0 text-center">Direction</span>
          <span className="w-16 text-right">Status</span>
        </div>
      </div>

      {/* Table feed container (DevTools style) */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto max-h-[380px] scrollbar bg-slate-950/40"
      >
        {sortedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs select-none">
            <Radio size={24} className="text-slate-700 mb-2 stroke-[1.5]" />
            Console clear. No telemetry events recorded.
          </div>
        ) : (
          sortedLogs.map((log) => (
            <LogRow
              key={log.id}
              log={log}
              isExpanded={!!expandedLogs[log.id]}
              onToggleExpand={handleToggleExpand}
            />
          ))
        )}
      </div>
    </div>
  );
};
