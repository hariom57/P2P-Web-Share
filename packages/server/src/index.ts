import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager, RoomError } from './services/room-manager.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), activeRooms: roomManager.getActiveRoomCount() });
});

io.on('connection', (socket) => {
  console.log(`[connect] socket=${socket.id}`);

  socket.on('create-room', () => {
    try {
      const room = roomManager.createRoom();
      socket.join(room.id);
      socket.emit('room-created', {
        roomId: room.id,
        expiresAt: room.expiresAt,
      });
      console.log(`[create-room] socket=${socket.id} room=${room.id}`);
    } catch (err) {
      socket.emit('room-error', {
        code: 'CREATE_FAILED',
        message: err instanceof Error ? err.message : 'Failed to create room',
      });
    }
  });

  socket.on('join-room', (data: { roomId: string }) => {
    try {
      const { room, peerCount } = roomManager.joinRoom(data.roomId, socket.id);
      socket.join(room.id);
      socket.emit('room-joined', {
        roomId: room.id,
        peerCount,
      });
      socket.to(room.id).emit('peer-joined', {
        peerId: socket.id,
      });
      console.log(`[join-room] socket=${socket.id} room=${room.id} peers=${peerCount}`);
    } catch (err) {
      if (err instanceof RoomError) {
        socket.emit('room-error', { code: err.code, message: err.message });
      } else {
        socket.emit('room-error', {
          code: 'JOIN_FAILED',
          message: err instanceof Error ? err.message : 'Failed to join room',
        });
      }
    }
  });

  socket.on('leave-room', (data: { roomId: string }) => {
    const { removed, remainingPeers } = roomManager.leaveRoom(data.roomId, socket.id);
    if (removed) {
      socket.leave(data.roomId);
      socket.to(data.roomId).emit('peer-disconnected', {
        peerId: socket.id,
      });
      console.log(`[leave-room] socket=${socket.id} room=${data.roomId} remaining=${remainingPeers}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[disconnect] socket=${socket.id}`);
    const room = roomManager.findRoomBySocketId(socket.id);
    if (room) {
      const { removed } = roomManager.leaveRoom(room.id, socket.id);
      if (removed) {
        socket.to(room.id).emit('peer-disconnected', {
          peerId: socket.id,
        });
      }
    }
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`signaling-server listening on port ${PORT}`);
});
