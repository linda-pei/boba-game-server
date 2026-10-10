import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuthContext } from "./hooks/AuthContext";
import SetUsername from "./components/SetUsername";
import Home from "./components/Home";
import Lobby from "./components/Lobby";
import GameRouter from "./components/GameRouter";
import JoinRedirect from "./components/JoinRedirect";
import ThemeToggle from "./components/shared/ThemeToggle";
import DevModeGate from "./components/dev-feedback/DevModeGate";
import "./App.css";

// Lazy so the dev overlay (and its CSS) stays out of the production bundle.
const DevFeedbackOverlay = lazy(() => import("./components/dev-feedback/DevFeedbackOverlay"));

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
      <Route path="/join/:roomCode" element={<JoinRedirect />} />
      <Route path="/lobby/:roomCode" element={<Lobby />} />
      <Route path="/game/:roomCode" element={<GameRouter />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeToggle />
        <AppContent />
        {import.meta.env.DEV ? <Suspense fallback={null}><DevFeedbackOverlay /></Suspense> : <DevModeGate />}
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
