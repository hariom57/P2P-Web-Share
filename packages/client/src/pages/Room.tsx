import { useParams } from 'react-router-dom';

function Room() {
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Room</h2>
        <p className="text-gray-400 mb-4">Room ID: <span className="font-mono text-blue-400">{roomId}</span></p>
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
          <span>Waiting for peer to connect...</span>
        </div>
      </div>
    </div>
  );
}

export default Room;
