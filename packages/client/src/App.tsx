import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.js';
import Room from './pages/Room.js';
import Transfer from './pages/Transfer.js';
import Completion from './pages/Completion.js';
import History from './pages/History.js';
import NeonCursor from './components/NeonCursor.js';
import { useSocket } from './hooks/useSocket.js';

function AppContent() {
  useSocket();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/room/:roomId" element={<Room />} />
      <Route path="/transfer/:roomId" element={<Transfer />} />
      <Route path="/complete/:roomId" element={<Completion />} />
      <Route path="/history" element={<History />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen">
        <NeonCursor />
        <div className="relative z-10 min-h-screen bg-gray-950/70 backdrop-blur-sm">
          <AppContent />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
