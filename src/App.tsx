import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuthContext } from "./hooks/AuthContext";
import SetUsername from "./components/SetUsername";
import Home from "./components/Home";
import Lobby from "./components/Lobby";
import GameRouter from "./components/GameRouter";
import "./App.css";

function AppContent() {
  const { uid, username, setUsername, loading } = useAuthContext();

  if (loading || !uid) {
    return <p>Loading...</p>;
  }

  if (!username) {
    return <SetUsername onSubmit={setUsername} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/lobby/:roomCode" element={<Lobby />} />
      <Route path="/game/:roomCode" element={<GameRouter />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
