export interface CursorSelection {
  startOffset: number;
  endOffset: number;
  collapsed: boolean;
}

export interface FormattingState {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
}

export interface SyncStatePayload {
  html: string;
  selection: CursorSelection | null;
  activeFormats: FormattingState;
  isTyping: boolean;
}

export type MessageType =
  | 'HANDSHAKE_INIT'
  | 'HANDSHAKE_ACK'
  | 'SYNC_STATE'
  | 'SYNC_CURSOR'
  | 'PING'
  | 'PONG';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SyncMessage<T = any> {
  id: string;
  source: string; // 'frame-a' | 'frame-b' | 'host'
  target: string; // 'frame-a' | 'frame-b' | 'host' | '*'
  timestamp: number;
  type: MessageType;
  version: number;
  payload: T;
}

export interface ActionLogEntry {
  id: string;
  timestamp: number;
  direction: 'sent' | 'received' | 'relayed';
  source: string;
  target: string;
  type: MessageType;
  details: string;
  success: boolean;
}
