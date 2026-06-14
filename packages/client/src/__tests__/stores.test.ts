import { describe, it, expect, beforeEach } from 'vitest';
import { useRoomStore } from '../stores/roomStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useTransferStore } from '../stores/transferStore';
import { useUIStore } from '../stores/uiStore';
import { useResumeStore } from '../stores/resumeStore';

describe('roomStore', () => {
  beforeEach(() => {
    useRoomStore.getState().reset();
  });

  it('should start with idle phase', () => {
    const state = useRoomStore.getState();
    expect(state.roomPhase).toBe('idle');
    expect(state.roomId).toBeNull();
    expect(state.peerConnected).toBe(false);
  });

  it('should set room ID and phase', () => {
    useRoomStore.getState().setRoomId('abc123');
    useRoomStore.getState().setRoomPhase('waiting');
    expect(useRoomStore.getState().roomId).toBe('abc123');
    expect(useRoomStore.getState().roomPhase).toBe('waiting');
  });

  it('should track peer connection state', () => {
    useRoomStore.getState().setPeerConnected(true);
    expect(useRoomStore.getState().peerConnected).toBe(true);
  });

  it('should handle room error', () => {
    useRoomStore.getState().setRoomError('Room not found');
    expect(useRoomStore.getState().roomError).toBe('Room not found');
  });

  it('should reset to initial state', () => {
    useRoomStore.getState().setRoomId('abc123');
    useRoomStore.getState().setRoomPhase('connected');
    useRoomStore.getState().reset();
    expect(useRoomStore.getState().roomId).toBeNull();
    expect(useRoomStore.getState().roomPhase).toBe('idle');
  });
});

describe('connectionStore', () => {
  beforeEach(() => {
    useConnectionStore.getState().reset();
  });

  it('should start with new connections', () => {
    const state = useConnectionStore.getState();
    expect(state.connectionState).toBe('new');
    expect(state.dataChannelState).toBe('connecting');
  });

  it('should track connection states', () => {
    useConnectionStore.getState().setConnectionState('connected');
    useConnectionStore.getState().setIceConnectionState('completed');
    useConnectionStore.getState().setDataChannelState('open');

    expect(useConnectionStore.getState().connectionState).toBe('connected');
    expect(useConnectionStore.getState().iceConnectionState).toBe('completed');
    expect(useConnectionStore.getState().dataChannelState).toBe('open');
  });

  it('should track latency', () => {
    useConnectionStore.getState().setLatency(42);
    expect(useConnectionStore.getState().latencyMs).toBe(42);
  });
});

describe('transferStore', () => {
  beforeEach(() => {
    useTransferStore.getState().reset();
  });

  it('should start in idle phase', () => {
    const state = useTransferStore.getState();
    expect(state.transferPhase).toBe('idle');
    expect(state.progressPercent).toBe(0);
  });

  it('should set file metadata', () => {
    useTransferStore.getState().setFileMetadata({
      fileName: 'test.pdf',
      fileSize: 1024,
      fileType: 'application/pdf',
    });
    const state = useTransferStore.getState();
    expect(state.fileName).toBe('test.pdf');
    expect(state.fileSize).toBe(1024);
    expect(state.fileType).toBe('application/pdf');
  });

  it('should track chunk progress', () => {
    useTransferStore.getState().setFileMetadata({
      fileName: 'test.bin',
      fileSize: 32000,
      fileType: 'application/octet-stream',
    });
    useTransferStore.setState({ totalChunks: 10 });

    for (let i = 0; i < 5; i++) {
      useTransferStore.getState().incrementChunksAcknowledged();
    }
    expect(useTransferStore.getState().chunksAcknowledged).toBe(5);
    expect(useTransferStore.getState().progressPercent).toBe(50);
  });

  it('should calculate speed with exponential moving average', () => {
    useTransferStore.getState().updateSpeed(16000, 1000);
    expect(useTransferStore.getState().currentSpeedBps).toBe(16000);

    useTransferStore.getState().updateSpeed(16000, 1000);
    expect(useTransferStore.getState().averageSpeedBps).toBeGreaterThan(0);
  });

  it('should handle error state', () => {
    useTransferStore.getState().setTransferError('Connection lost');
    useTransferStore.getState().setTransferPhase('error');
    expect(useTransferStore.getState().transferPhase).toBe('error');
    expect(useTransferStore.getState().transferError).toBe('Connection lost');
  });
});

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.getState().reset();
  });

  it('should default to dark theme', () => {
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('should change theme', () => {
    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('should add and dismiss notifications', () => {
    useUIStore.getState().addNotification({
      type: 'info',
      title: 'Test',
      durationMs: 3000,
    });
    expect(useUIStore.getState().notifications.length).toBe(1);
    expect(useUIStore.getState().notifications[0].title).toBe('Test');

    const id = useUIStore.getState().notifications[0].id;
    useUIStore.getState().dismissNotification(id);
    expect(useUIStore.getState().notifications.length).toBe(0);
  });

  it('should manage modal state', () => {
    useUIStore.getState().openModal('confirm', { message: 'Sure?' });
    expect(useUIStore.getState().activeModal).toBe('confirm');
    expect(useUIStore.getState().modalData).toEqual({ message: 'Sure?' });

    useUIStore.getState().closeModal();
    expect(useUIStore.getState().activeModal).toBeNull();
  });
});

describe('resumeStore', () => {
  beforeEach(() => {
    useResumeStore.getState().clearResumableTransfer();
  });

  it('should start with no resumable transfer', () => {
    const state = useResumeStore.getState();
    expect(state.hasResumableTransfer).toBe(false);
    expect(state.role).toBeNull();
    expect(state.resumeAction).toBeNull();
  });

  it('should store resumable transfer metadata', () => {
    useResumeStore.getState().setResumableTransfer({
      role: 'sender',
      fileName: 'test.bin',
      fileSize: 1000,
      totalChunks: 20,
      lastReceivedChunk: 10,
      lastActivity: Date.now(),
    });

    const state = useResumeStore.getState();
    expect(state.hasResumableTransfer).toBe(true);
    expect(state.role).toBe('sender');
    expect(state.fileName).toBe('test.bin');
    expect(state.fileSize).toBe(1000);
    expect(state.totalChunks).toBe(20);
    expect(state.lastReceivedChunk).toBe(10);
  });

  it('should set resume action', () => {
    useResumeStore.getState().setResumableTransfer({
      role: 'receiver', fileName: 'a.txt', fileSize: 100,
      totalChunks: 5, lastReceivedChunk: 2, lastActivity: Date.now(),
    });
    expect(useResumeStore.getState().resumeAction).toBe('prompt');

    useResumeStore.getState().setResumeAction('resuming');
    expect(useResumeStore.getState().resumeAction).toBe('resuming');

    useResumeStore.getState().clearResumableTransfer();
    expect(useResumeStore.getState().hasResumableTransfer).toBe(false);
    expect(useResumeStore.getState().resumeAction).toBeNull();
  });
});
