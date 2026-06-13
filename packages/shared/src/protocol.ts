export enum MessageType {
  FILE_META = 0x00,
  CHUNK = 0x01,
  CHUNK_ACK = 0x02,
  VERIFY_REQUEST = 0x03,
  VERIFY_RESPONSE = 0x04,
  ERROR = 0x05,
  CANCEL = 0x06,
}

export enum ChunkAckStatus {
  OK = 0x00,
  RETRY = 0x01,
}

export enum ErrorCode {
  CHUNK_MISMATCH = 0x0001,
  SEQUENCE_GAP = 0x0002,
  CHECKSUM_FAIL = 0x0003,
  BUFFER_OVERFLOW = 0x0004,
  TIMEOUT = 0x0005,
  UNKNOWN = 0x00FF,
}

export enum CancelReason {
  USER_CANCELLED = 0x0001,
  PEER_DISCONNECTED = 0x0002,
  TRANSFER_TIMEOUT = 0x0003,
  UNKNOWN = 0x00FF,
}

export interface FileMetaMessage {
  type: MessageType.FILE_META;
  fileName: string;
  fileSize: bigint;
  mimeType: string;
  sha256Hash: Uint8Array;
  totalChunks: number;
  chunkSize: number;
}

export interface ChunkMessage {
  type: MessageType.CHUNK;
  sequence: number;
  data: Uint8Array;
}

export interface ChunkAckMessage {
  type: MessageType.CHUNK_ACK;
  sequence: number;
  status: ChunkAckStatus;
}

export interface VerifyRequestMessage {
  type: MessageType.VERIFY_REQUEST;
  senderHash: Uint8Array;
}

export interface VerifyResponseMessage {
  type: MessageType.VERIFY_RESPONSE;
  match: boolean;
  receiverHash?: Uint8Array;
}

export interface ErrorMessage {
  type: MessageType.ERROR;
  code: ErrorCode;
  message: string;
}

export interface CancelMessage {
  type: MessageType.CANCEL;
  reason: CancelReason;
  message: string;
}

export type DataChannelMessage =
  | FileMetaMessage
  | ChunkMessage
  | ChunkAckMessage
  | VerifyRequestMessage
  | VerifyResponseMessage
  | ErrorMessage
  | CancelMessage;

export const PROTOCOL_CONSTANTS = {
  ENVELOPE_HEADER_SIZE: 5,
  MAX_BUFFERED_AMOUNT: 1024 * 1024,
  MIN_WINDOW_SIZE: 4,
  MAX_WINDOW_SIZE: 64,
  CHUNK_ACK_TIMEOUT_MS: 60_000,
  META_ACK_TIMEOUT_MS: 30_000,
  VERIFY_TIMEOUT_MS: 30_000,
  IDLE_TIMEOUT_MS: 120_000,
  MAX_RETRIES: 5,
} as const;
