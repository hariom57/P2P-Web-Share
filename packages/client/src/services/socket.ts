import io from 'socket.io-client';

type Socket = ReturnType<typeof io>;

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:3001', {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  if (!socket.connected) {
    console.log('[socket] connecting...');
    socket.connect();
  }

  socket.on('connect', () => {
    console.log('[socket] connected', socket?.id);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('[socket] disconnected', reason);
  });

  socket.on('connect_error', (err: Error) => {
    console.error('[socket] connect_error', err);
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
