import React from 'react';
import type { KeyboardEvent } from 'react';

interface EditorProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onExecuteFormat: (command: 'bold' | 'italic' | 'strikeThrough') => void;
  onExecuteUndo: () => void;
  onExecuteRedo: () => void;
  peerIsTyping: boolean;
  onCaretOrContentChange: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  editorRef,
  onExecuteFormat,
  onExecuteUndo,
  onExecuteRedo,
  peerIsTyping,
  onCaretOrContentChange,
}) => {
  /**
   * Captures keyboard combinations to invoke matching rich text commands
   * and blocks native browser updates to trigger custom synchronization.
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const isMeta = e.ctrlKey || e.metaKey;

    if (isMeta) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          onExecuteFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          onExecuteFormat('italic');
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            onExecuteRedo();
          } else {
            onExecuteUndo();
          }
          break;
        case 'y':
          e.preventDefault();
          onExecuteRedo();
          break;
        default:
          break;
      }
    }
  };

  return (
    <div className="relative flex flex-col flex-1 min-h-[300px]">
      <div
        ref={editorRef}
        contentEditable
        onKeyDown={handleKeyDown}
        onInput={onCaretOrContentChange}
        onKeyUp={onCaretOrContentChange}
        onMouseUp={onCaretOrContentChange}
        className="flex-1 p-5 text-slate-100 bg-slate-950/65 border-x border-b border-slate-700/50 rounded-b-2xl focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/40 min-h-[300px] overflow-y-auto text-left rich-editor text-base leading-relaxed"
        data-placeholder="Start typing your collaborative rich text here..."
      />

      {/* Typing indicator toast overlay */}
      {peerIsTyping && (
        <div className="absolute bottom-4 right-4 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs flex items-center gap-1.5 shadow-[0_4px_16px_rgba(99,102,241,0.2)] animate-pulse select-none">
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
          </span>
          Peer is typing...
        </div>
      )}
    </div>
  );
};
