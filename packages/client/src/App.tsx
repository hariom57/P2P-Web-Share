import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Room from './pages/Room';
import Transfer from './pages/Transfer';
import Completion from './pages/Completion';
import History from './pages/History';
import { useSocket } from './hooks/useSocket';

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
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
