import io from 'socket.io-client';

type Socket = ReturnType<typeof io>;

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (!socket) {
    const serverUrl = import.meta.env.VITE_SERVER_URL || '';
    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
