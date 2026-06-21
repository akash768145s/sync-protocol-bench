import { useState, useCallback, useRef, useEffect } from 'react';
import type { FormattingState, CursorSelection } from '../types';
import { getCursorSelection } from '../services/cursor';

export function useRichText(
  editorRef: React.RefObject<HTMLDivElement | null>,
  onContentChange: (html: string, selection: CursorSelection | null) => void
) {

  const [activeFormats, setActiveFormats] = useState<FormattingState>({
    bold: false,
    italic: false,
    strikethrough: false,
  });

  const onContentChangeRef = useRef(onContentChange);
  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  /**
   * Scans formatting states at the current selection caret using queryCommandState.
   */
  const updateActiveFormats = useCallback(() => {
    if (typeof document === 'undefined') return;
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        strikethrough: document.queryCommandState('strikeThrough'),
      });
    } catch {
      // Gracefully fail if selection querying is temporarily locked or out of focus
    }
  }, []);

  /**
   * Executes formatting command (bold, italic, strikeThrough) on selected range.
   */
  const executeFormat = useCallback(
    (command: 'bold' | 'italic' | 'strikeThrough') => {
      if (!editorRef.current) return;
      editorRef.current.focus();

      try {
        document.execCommand(command, false);
        updateActiveFormats();

        const html = editorRef.current.innerHTML;
        const selection = getCursorSelection(editorRef.current);
        onContentChangeRef.current(html, selection);
      } catch (error) {
        console.warn(`[RichTextService] Exec command failed for ${command}:`, error);
      }
    },
    [editorRef, updateActiveFormats]
  );

  /**
   * Triggers native browser undo and propagates update.
   */
  const executeUndo = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    try {
      document.execCommand('undo', false);
      updateActiveFormats();

      const html = editorRef.current.innerHTML;
      const selection = getCursorSelection(editorRef.current);
      onContentChangeRef.current(html, selection);
    } catch (error) {
      console.warn('[RichTextService] Undo command failed:', error);
    }
  }, [editorRef, updateActiveFormats]);

  /**
   * Triggers native browser redo and propagates update.
   */
  const executeRedo = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    try {
      document.execCommand('redo', false);
      updateActiveFormats();

      const html = editorRef.current.innerHTML;
      const selection = getCursorSelection(editorRef.current);
      onContentChangeRef.current(html, selection);
    } catch (error) {
      console.warn('[RichTextService] Redo command failed:', error);
    }
  }, [editorRef, updateActiveFormats]);

  const focusEditor = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [editorRef]);

  return {
    editorRef,
    activeFormats,
    updateActiveFormats,
    executeFormat,
    executeUndo,
    executeRedo,
    focusEditor,
  };
}
