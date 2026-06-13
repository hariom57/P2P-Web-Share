import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  saveCheckpoint,
  getCheckpoint,
  deleteCheckpoint,
  getAllCheckpoints,
  clearAllCheckpoints,
} from '../services/checkpoint-store';

const TEST_ROOM = 'test-room-id';

describe('checkpoint-store (IndexedDB)', () => {
  beforeEach(async () => {
    await clearAllCheckpoints();
  });

  afterAll(async () => {
    await clearAllCheckpoints();
  });

  it('should save and retrieve a checkpoint', async () => {
    await saveCheckpoint(TEST_ROOM, {
      role: 'sender',
      fileName: 'test.txt',
      fileSize: 1000,
      totalChunks: 10,
      lastSentChunk: 5,
      lastReceivedChunk: 0,
      lastAcknowledgedChunk: 4,
      totalBytesSent: 500,
      timestamp: Date.now(),
    });

    const retrieved = await getCheckpoint(TEST_ROOM);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.roomId).toBe(TEST_ROOM);
    expect(retrieved!.lastSentChunk).toBe(5);
    expect(retrieved!.lastAcknowledgedChunk).toBe(4);
  });

  it('should return null for non-existent room', async () => {
    const result = await getCheckpoint('nonexistent');
    expect(result).toBeNull();
  });

  it('should update existing checkpoint', async () => {
    await saveCheckpoint(TEST_ROOM, {
      role: 'sender',
      fileName: 'test.txt',
      fileSize: 1000,
      totalChunks: 10,
      lastSentChunk: 3,
      lastReceivedChunk: 0,
      lastAcknowledgedChunk: 2,
      totalBytesSent: 300,
      timestamp: Date.now(),
    });

    await saveCheckpoint(TEST_ROOM, {
      role: 'sender',
      fileName: 'test.txt',
      fileSize: 1000,
      totalChunks: 10,
      lastSentChunk: 7,
      lastReceivedChunk: 0,
      lastAcknowledgedChunk: 6,
      totalBytesSent: 700,
      timestamp: Date.now(),
    });

    const retrieved = await getCheckpoint(TEST_ROOM);
    expect(retrieved!.lastSentChunk).toBe(7);
  });

  it('should delete a checkpoint', async () => {
    await saveCheckpoint(TEST_ROOM, {
      role: 'sender',
      fileName: 'test.txt',
      fileSize: 100,
      totalChunks: 2,
      lastSentChunk: 1,
      lastReceivedChunk: 0,
      lastAcknowledgedChunk: 1,
      totalBytesSent: 50,
      timestamp: Date.now(),
    });

    await deleteCheckpoint(TEST_ROOM);
    const retrieved = await getCheckpoint(TEST_ROOM);
    expect(retrieved).toBeNull();
  });

  it('should retrieve all checkpoints', async () => {
    await saveCheckpoint('room1', {
      role: 'sender', fileName: 'a.txt', fileSize: 100, totalChunks: 2,
      lastSentChunk: 1, lastReceivedChunk: 0, lastAcknowledgedChunk: 1, totalBytesSent: 50, timestamp: 0,
    });
    await saveCheckpoint('room2', {
      role: 'receiver', fileName: 'b.txt', fileSize: 200, totalChunks: 4,
      lastSentChunk: 0, lastReceivedChunk: 3, lastAcknowledgedChunk: 0, totalBytesSent: 0, timestamp: 0,
    });

    const all = await getAllCheckpoints();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});
