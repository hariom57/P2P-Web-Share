import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { RoomManager } from '../services/room-manager';

function createServerPair(): Promise<{ server: HttpServer; io: Server; port: number }> {
  return new Promise((resolve) => {
    const app = express();
    const server = createServer(app);
    const io = new Server(server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    const roomManager = new RoomManager();

    app.get('/health', (_req: any, res: any) => {
      res.json({ status: 'ok' });
    });

    io.on('connection', (socket) => {
      socket.on('create-room', (_data, ack) => {
        const room = roomManager.createRoom();
        roomManager.joinRoom(room.id, socket.id);
        socket.join(room.id);
        socket.emit('room-created', { roomId: room.id, expiresAt: room.expiresAt });
        if (typeof ack === 'function') ack({ ok: true });
      });

      socket.on('join-room', (data: { roomId: string }) => {
        try {
          const { room, peerCount } = roomManager.joinRoom(data.roomId, socket.id);
          socket.join(room.id);
          socket.emit('room-joined', { roomId: room.id, peerCount });
          socket.to(room.id).emit('peer-joined', { peerId: socket.id });
        } catch (err: any) {
          socket.emit('room-error', { code: err.code, message: err.message });
        }
      });

      socket.on('leave-room', (data: { roomId: string }) => {
        const { removed } = roomManager.leaveRoom(data.roomId, socket.id);
        if (removed) {
          socket.leave(data.roomId);
          socket.to(data.roomId).emit('peer-disconnected', { peerId: socket.id });
        }
      });

      socket.on('offer', (data: { roomId: string; offer: any }) => {
        const otherPeerId = roomManager.getOtherPeerSocketId(data.roomId, socket.id);
        if (otherPeerId) {
          socket.to(otherPeerId).emit('offer', { offer: data.offer });
        }
      });

      socket.on('answer', (data: { roomId: string; answer: any }) => {
        const otherPeerId = roomManager.getOtherPeerSocketId(data.roomId, socket.id);
        if (otherPeerId) {
          socket.to(otherPeerId).emit('answer', { answer: data.answer });
        }
      });

      socket.on('ice-candidate', (data: { roomId: string; candidate: any }) => {
        const otherPeerId = roomManager.getOtherPeerSocketId(data.roomId, socket.id);
        if (otherPeerId) {
          socket.to(otherPeerId).emit('ice-candidate', { candidate: data.candidate });
        }
      });

      socket.on('file-metadata', (data: { roomId: string; fileName: string; fileSize: number; fileType: string }) => {
        roomManager.setFileMetadata(data.roomId, { fileName: data.fileName, fileSize: data.fileSize, fileType: data.fileType });
        const otherPeerId = roomManager.getOtherPeerSocketId(data.roomId, socket.id);
        if (otherPeerId) {
          socket.to(otherPeerId).emit('file-metadata', { fileName: data.fileName, fileSize: data.fileSize, fileType: data.fileType });
        }
      });

      socket.on('transfer-complete', (data: { roomId: string; sha256Hash: string }) => {
        const otherPeerId = roomManager.getOtherPeerSocketId(data.roomId, socket.id);
        if (otherPeerId) {
          socket.to(otherPeerId).emit('transfer-complete', { sha256Hash: data.sha256Hash });
        }
      });

      socket.on('transfer-error', (data: { roomId: string; error: string }) => {
        const otherPeerId = roomManager.getOtherPeerSocketId(data.roomId, socket.id);
        if (otherPeerId) {
          socket.to(otherPeerId).emit('transfer-error', { error: data.error });
        }
      });

      socket.on('disconnect', () => {
        const room = roomManager.findRoomBySocketId(socket.id);
        if (room) {
          roomManager.leaveRoom(room.id, socket.id);
          socket.to(room.id).emit('peer-disconnected', { peerId: socket.id });
        }
      });
    });

    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, io, port });
    });
  });
}

describe('Signaling Server Integration', { timeout: 10_000 }, () => {
  let server: HttpServer | null = null;
  let ioServer: Server | null = null;
  let port: number = 0;
  let connectedSockets: ClientSocket[] = [];

  beforeEach(async () => {
    const pair = await createServerPair();
    server = pair.server;
    ioServer = pair.io;
    port = pair.port;
  });

  afterEach(() => {
    for (const sock of connectedSockets) {
      sock.close();
    }
    connectedSockets = [];
    ioServer?.close();
    server?.close();
  });

  function connectSocket(): Promise<ClientSocket> {
    return new Promise((resolve) => {
      const socket = Client(`http://localhost:${port}`);
      socket.on('connect', () => {
        connectedSockets.push(socket);
        resolve(socket);
      });
    });
  }

  describe('Room Lifecycle', () => {
    it('should create a room and return roomId', async () => {
      const sender = await connectSocket();
      const response = await new Promise<{ roomId: string; expiresAt: number }>((resolve) => {
        sender.emit('create-room');
        sender.on('room-created', (data) => resolve(data));
      });
      expect(response.roomId).toMatch(/^[a-z0-9]{6}$/);
      expect(response.expiresAt).toBeGreaterThan(Date.now());
      sender.close();
    });

    it('should allow two peers to join the same room', async () => {
      const sender = await connectSocket();
      const receiver = await connectSocket();

      const room = await new Promise<{ roomId: string }>((resolve) => {
        sender.emit('create-room');
        sender.on('room-created', (data) => resolve(data));
      });

      const [joinResult, peerJoined] = await Promise.all([
        new Promise<{ roomId: string; peerCount: number }>((resolve) => {
          receiver.emit('join-room', { roomId: room.roomId });
          receiver.on('room-joined', (data) => resolve(data));
        }),
        new Promise<{ peerId: string }>((resolve) => {
          sender.on('peer-joined', (data) => resolve(data));
        }),
      ]);

      expect(joinResult.roomId).toBe(room.roomId);
      expect(joinResult.peerCount).toBe(2);
      expect(peerJoined.peerId).toBeTruthy();

      sender.close();
      receiver.close();
    });

    it('should reject joining a non-existent room', async () => {
      const socket = await connectSocket();
      const errorPromise = new Promise<{ code: string }>((resolve) => {
        socket.on('room-error', (data) => resolve(data));
      });
      socket.emit('join-room', { roomId: 'xxxxxx' });
      const error = await errorPromise;
      expect(error.code).toBe('INVALID_ROOM');
      socket.close();
    });

    it('should notify peers on disconnect', async () => {
      const sender = await connectSocket();
      const receiver = await connectSocket();

      const room = await new Promise<{ roomId: string }>((resolve) => {
        sender.emit('create-room');
        sender.on('room-created', (data) => resolve(data));
      });

      await new Promise<void>((resolve) => {
        receiver.emit('join-room', { roomId: room.roomId });
        receiver.on('room-joined', () => resolve());
      });

      const disconnectPromise = new Promise<{ peerId: string }>((resolve) => {
        sender.on('peer-disconnected', (data) => resolve(data));
      });

      receiver.close();
      const result = await disconnectPromise;
      expect(result.peerId).toBeTruthy();
      sender.close();
    });
  });

  describe('WebRTC Signaling', () => {
    it('should forward offer between peers', async () => {
      const sender = await connectSocket();
      const receiver = await connectSocket();

      const room = await createAndJoinRoom(sender, receiver);

      const offerPromise = new Promise<any>((resolve) => {
        receiver.on('offer', (data) => resolve(data));
      });

      const testOffer = { type: 'offer', sdp: 'v=0\r\no=- 0 1 IN IP4 0.0.0.0\r\n' };
      sender.emit('offer', { roomId: room.roomId, offer: testOffer });

      const received = await offerPromise;
      expect(received.offer).toEqual(testOffer);

      sender.close();
      receiver.close();
    });

    it('should forward answer between peers', async () => {
      const sender = await connectSocket();
      const receiver = await connectSocket();

      const room = await createAndJoinRoom(sender, receiver);

      const answerPromise = new Promise<any>((resolve) => {
        sender.on('answer', (data) => resolve(data));
      });

      const testAnswer = { type: 'answer', sdp: 'v=0\r\no=- 0 1 IN IP4 0.0.0.0\r\n' };
      receiver.emit('answer', { roomId: room.roomId, answer: testAnswer });

      const received = await answerPromise;
      expect(received.answer).toEqual(testAnswer);

      sender.close();
      receiver.close();
    });

    it('should forward ICE candidates between peers', async () => {
      const sender = await connectSocket();
      const receiver = await connectSocket();

      const room = await createAndJoinRoom(sender, receiver);

      const icePromise = new Promise<any>((resolve) => {
        receiver.on('ice-candidate', (data) => resolve(data));
      });

      const testCandidate = { candidate: 'candidate:1 1 UDP 2122252543 192.168.1.1 54321 typ host', sdpMid: '0', sdpMLineIndex: 0 };
      sender.emit('ice-candidate', { roomId: room.roomId, candidate: testCandidate });

      const received = await icePromise;
      expect(received.candidate).toEqual(testCandidate);

      sender.close();
      receiver.close();
    });
  });

  describe('File Transfer Events', () => {
    it('should forward file metadata between peers', async () => {
      const sender = await connectSocket();
      const receiver = await connectSocket();

      const room = await createAndJoinRoom(sender, receiver);

      const metaPromise = new Promise<any>((resolve) => {
        receiver.on('file-metadata', (data) => resolve(data));
      });

      sender.emit('file-metadata', {
        roomId: room.roomId,
        fileName: 'test.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
      });

      const received = await metaPromise;
      expect(received.fileName).toBe('test.pdf');
      expect(received.fileSize).toBe(1024);
      expect(received.fileType).toBe('application/pdf');

      sender.close();
      receiver.close();
    });

    it('should forward transfer-complete event', async () => {
      const sender = await connectSocket();
      const receiver = await connectSocket();

      const room = await createAndJoinRoom(sender, receiver);

      const completePromise = new Promise<any>((resolve) => {
        receiver.on('transfer-complete', (data) => resolve(data));
      });

      sender.emit('transfer-complete', { roomId: room.roomId, sha256Hash: 'abc123' });
      const received = await completePromise;
      expect(received.sha256Hash).toBe('abc123');

      sender.close();
      receiver.close();
    });

    it('should forward transfer-error event', async () => {
      const sender = await connectSocket();
      const receiver = await connectSocket();

      const room = await createAndJoinRoom(sender, receiver);

      const errorPromise = new Promise<any>((resolve) => {
        receiver.on('transfer-error', (data) => resolve(data));
      });

      sender.emit('transfer-error', { roomId: room.roomId, error: 'Connection lost' });
      const received = await errorPromise;
      expect(received.error).toBe('Connection lost');

      sender.close();
      receiver.close();
    });
  });
});

async function createAndJoinRoom(sender: ClientSocket, receiver: ClientSocket): Promise<{ roomId: string }> {
  const room = await new Promise<{ roomId: string }>((resolve) => {
    sender.emit('create-room');
    sender.on('room-created', (data) => resolve(data));
  });

  await new Promise<void>((resolve) => {
    receiver.emit('join-room', { roomId: room.roomId });
    receiver.on('room-joined', () => resolve());
  });

  return room;
}
