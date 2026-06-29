import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthContext } from "../hooks/AuthContext";
import "./lobby.css";
import { useRoom, joinRoom, leaveRoom, updateRoomSettings } from "../hooks/useRoom";
import { startGame } from "../games/things-in-rings/useGame";
import { startScoutGame } from "../games/scout/useScoutGame";
import { startWerewordsGame } from "../games/werewords/useWerewordsGame";
import { startOrderOverloadGame } from "../games/order-overload/useOrderOverloadGame";
import { startDeepSeaGame } from "../games/deep-sea/useDeepSeaGame";
import { startTakeTimeGame } from "../games/take-time/useTakeTimeGame";
import { startFruitBossGame } from "../games/fruit-boss/useFruitBossGame";
import { startStartupsGame } from "../games/startups/useStartupsGame";
import { DEFINED_CHAPTERS, TESTS_PER_CHAPTER, toRoman, getLevel } from "../games/take-time/levels";
import { DECKS } from "../games/order-overload/deck";
import { DIFFICULTIES } from "../games/werewords/words";
import BrandTitle from "./shared/BrandTitle";
import GameSticker from "./shared/GameSticker";
import { GAME_ID_TO_KEY } from "./shared/GameIcon";
import PlayerCountStatus from "./shared/PlayerCountStatus";
import ConfirmButton from "./shared/ConfirmButton";
import { PlayerChipList, PlayerChip, Badge } from "./shared/PlayerChipList";

export default function Lobby() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { uid, username } = useAuthContext();
  const { room, loading, error } = useRoom(roomCode);
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  // Auto-join if the player opened the lobby link but isn't in the room yet
  useEffect(() => {
    if (!room || !uid || !username || !roomCode) return;
    if (room.status !== "lobby") return;
    if (room.players[uid]) return; // already in the room
    joinRoom(roomCode, uid, username).catch((err) =>
      console.error("Auto-join failed:", err)
    );
  }, [room, uid, username, roomCode]);

  // Auto-redirect all players when game starts
  useEffect(() => {
    if (room?.status === "in-progress") {
      navigate(`/game/${roomCode}`);
    }
  }, [room?.status, roomCode, navigate]);

  if (loading) return <p>Loading room...</p>;
  if (error || !room) {
    return (
      <div className="lobby screen">
        <BrandTitle size="md" />
        <p className="error-message">{error || "Room not found"}</p>
        <button className="btn btn--primary" onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  const isHost = room.host === uid;
  const players = Object.entries(room.players);
  const gameType = room.gameType || "things-in-rings";
  const isTIR = gameType === "things-in-rings";
  const isScout = gameType === "scout";
  const isWerewords = gameType === "werewords";
  const isOrderOverload = gameType === "order-overload";
  const isDeepSea = gameType === "deep-sea";
  const isTakeTime = gameType === "take-time";
  const isFruitBoss = gameType === "fruit-boss";
  const isStartups = gameType === "startups";

  // TIR-specific
  const knower = room.settings.knower;
  const mode = room.settings.mode ?? "competitive";
  const nonKnowerCount = players.filter(([id]) => id !== knower).length;
  const minNonKnowers = mode === "coop" ? 1 : 2;
  const canStartTIR = !!knower && nonKnowerCount >= minNonKnowers;

  // Scout-specific
  const canStartScout = players.length >= 3 && players.length <= 5;

  // Werewords-specific
  const canStartWerewords = players.length >= 4 && players.length <= 11;

  // Order Overload-specific
  const canStartOrderOverload = players.length >= 2 && players.length <= 6;

  // Deep Sea-specific
  const canStartDeepSea = players.length >= 2 && players.length <= 6;

  // Take Time-specific
  const canStartTakeTime = players.length >= 2 && players.length <= 4;

  // Fruit Boss-specific
  const canStartFruitBoss = players.length >= 2 && players.length <= 4;

  // Startups-specific
  const canStartStartups = players.length >= 3 && players.length <= 6;

  const canStart = isStartups
    ? canStartStartups
    : isFruitBoss
    ? canStartFruitBoss
    : isTakeTime
    ? canStartTakeTime
    : isDeepSea
    ? canStartDeepSea
    : isScout
    ? canStartScout
    : isWerewords
      ? canStartWerewords
      : isOrderOverload
        ? canStartOrderOverload
        : canStartTIR;

  const handleLeave = async () => {
    if (!uid || !roomCode) return;
    await leaveRoom(roomCode, uid);
    navigate("/");
  };

  const handleSetKnower = (playerId: string) => {
    if (!roomCode) return;
    updateRoomSettings(roomCode, { knower: playerId });
  };

  const handleSetRings = (numRings: number) => {
    if (!roomCode) return;
    updateRoomSettings(roomCode, { numRings });
  };

  const handleSetMode = (newMode: "competitive" | "coop") => {
    if (!roomCode) return;
    updateRoomSettings(roomCode, { mode: newMode });
  };

  const handleSetGameType = (type: string) => {
    if (!roomCode) return;
    updateRoomSettings(roomCode, { gameType: type });
  };

  const handleStart = async () => {
    if (!roomCode || !room) return;
    setStarting(true);
    try {
      if (isStartups) {
        await startStartupsGame(roomCode, room);
      } else if (isFruitBoss) {
        await startFruitBossGame(roomCode, room);
      } else if (isTakeTime) {
        await startTakeTimeGame(roomCode, room);
      } else if (isDeepSea) {
        await startDeepSeaGame(roomCode, room);
      } else if (isScout) {
        await startScoutGame(roomCode, room);
      } else if (isWerewords) {
        await startWerewordsGame(roomCode, room);
      } else if (isOrderOverload) {
        await startOrderOverloadGame(roomCode, room);
      } else {
        await startGame(roomCode, room);
      }
      navigate(`/game/${roomCode}`);
    } catch (err) {
      console.error("Failed to start game:", err);
      setStarting(false);
    }
  };

  return (
    <div className="lobby screen">
      <BrandTitle size="md" />
      <h2>Room: {roomCode}</h2>
      <p>
        {players.length}/{room.maxPlayers} players
      </p>

      <h3>Players</h3>
      <PlayerChipList>
        {players
          .sort(([, a], [, b]) => a.order - b.order)
          .map(([id, player]) => (
            <PlayerChip key={id}>
              {player.name}
              {id === room.host && <Badge variant="host">Host</Badge>}
              {isTIR && id === knower && (
                <Badge variant="knower">Knower</Badge>
              )}
              {isTIR && isHost && id !== knower && (
                <button
                  onClick={() => handleSetKnower(id)}
                  className="btn btn--secondary btn--sm"
                >
                  Set Knower
                </button>
              )}
            </PlayerChip>
          ))}
      </PlayerChipList>

      <div className="settings-panel">
        <h3>Settings</h3>

        {/* Game type selector */}
        <div className="game-selector">
          <label className="game-selector-label">Game</label>
          <div className="game-sticker-grid">
            {(["things-in-rings", "scout", "werewords", "order-overload", "deep-sea", "take-time", "fruit-boss", "startups"] as const).map((id) => (
              <GameSticker
                key={id}
                game={GAME_ID_TO_KEY[id]}
                selected={gameType === id}
                disabled={!isHost}
                onClick={() => handleSetGameType(id)}
              />
            ))}
          </div>
        </div>

        {/* Deep Sea info */}
        {isDeepSea && (
          <PlayerCountStatus gameName="Deep Sea Adventure" count={players.length} min={2} max={6} />
        )}

        {/* Fruit Boss info */}
        {isFruitBoss && (
          <PlayerCountStatus gameName="Fruit Boss" count={players.length} min={2} max={4} />
        )}

        {/* Startups settings */}
        {isStartups && (
          <>
            <PlayerCountStatus gameName="Startups" count={players.length} min={3} max={6} />
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
              <input
                type="checkbox"
                checked={room.settings.roundsEnabled === true}
                onChange={(e) => updateRoomSettings(roomCode!, { roundsEnabled: e.target.checked })}
                disabled={!isHost}
              />
              4-round mode (+2/+1/-1 per round)
            </label>
          </>
        )}

        {/* Take Time settings */}
        {isTakeTime && (
          <>
            <PlayerCountStatus gameName="Take Time" count={players.length} min={2} max={4} />
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
              Chapter:
              <select
                value={room.settings.chapter ?? 1}
                onChange={(e) => updateRoomSettings(roomCode!, { chapter: Number(e.target.value) })}
                disabled={!isHost}
              >
                {Array.from({ length: DEFINED_CHAPTERS }, (_, i) => i + 1).map((ch) => (
                  <option key={ch} value={ch}>{toRoman(ch)}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
              Test:
              <select
                value={room.settings.testNumber ?? 1}
                onChange={(e) => updateRoomSettings(roomCode!, { testNumber: Number(e.target.value) })}
                disabled={!isHost}
              >
                {Array.from({ length: TESTS_PER_CHAPTER }, (_, i) => i + 1).map((t) => {
                  const level = getLevel(room.settings.chapter ?? 1, t);
                  return (
                    <option key={t} value={t} disabled={!level}>
                      {t}{!level ? " (not available)" : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
              <input
                type="checkbox"
                checked={room.settings.bonusTokensEnabled === true}
                onChange={(e) => updateRoomSettings(roomCode!, { bonusTokensEnabled: e.target.checked })}
                disabled={!isHost}
              />
              Bonus tokens (gain +1 reminder token each time you fail, up to 3)
            </label>
          </>
        )}

        {/* TIR settings */}
        {isTIR && (
          <>
            <p style={{ fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
              3 rings: Context (red), Attribute (blue), Word (green)
            </p>
            <div className="mode-toggle">
              <button
                className={`mode-toggle-btn${mode === "competitive" ? " active" : ""}`}
                onClick={() => handleSetMode("competitive")}
                disabled={!isHost}
              >
                Competitive
              </button>
              <button
                className={`mode-toggle-btn${mode === "coop" ? " active" : ""}`}
                onClick={() => handleSetMode("coop")}
                disabled={!isHost}
              >
                Co-op
              </button>
            </div>
          </>
        )}

        {/* Scout info */}
        {isScout && (
          <PlayerCountStatus gameName="Scout" count={players.length} min={3} max={5} />
        )}

        {/* Werewords info */}
        {isWerewords && (
          <>
            <PlayerCountStatus gameName="Werewords" count={players.length} min={4} max={11} />
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
              Mayor:
              <select
                value={room.settings.mayor ?? "random"}
                onChange={(e) => updateRoomSettings(roomCode!, { mayor: e.target.value })}
                disabled={!isHost}
              >
                <option value="random">Random</option>
                {players.map(([id, player]) => (
                  <option key={id} value={id}>{player.name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
              Difficulty:
              <select
                value={room.settings.difficulty ?? "medium"}
                onChange={(e) => updateRoomSettings(roomCode!, { difficulty: e.target.value })}
                disabled={!isHost}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
              Timer: {room.settings.timerMinutes ?? 4} min
              <input
                type="range"
                min={1}
                max={10}
                value={room.settings.timerMinutes ?? 4}
                onChange={(e) => updateRoomSettings(roomCode!, { timerMinutes: Number(e.target.value) })}
                disabled={!isHost}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
              <input
                type="checkbox"
                checked={room.settings.limitedTokens !== false}
                onChange={(e) => updateRoomSettings(roomCode!, { limitedTokens: e.target.checked })}
                disabled={!isHost}
              />
              Limited tokens (36 Yes/No, 10 Maybe)
            </label>
          </>
        )}

        {/* Order Overload info */}
        {isOrderOverload && (
          <>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
              Deck:
              <select
                value={room.settings.deckId ?? "cafe"}
                onChange={(e) => updateRoomSettings(roomCode!, { deckId: e.target.value })}
                disabled={!isHost}
              >
                {Object.entries(DECKS).map(([id, { label }]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </label>
            <PlayerCountStatus gameName="Order Overload" count={players.length} min={2} max={6} />
          </>
        )}

        {isHost && (
          <div style={{ textAlign: "center" }}>
            <button className="btn btn--primary" onClick={handleStart} disabled={!canStart || starting}>
              {starting ? "Starting..." : "Start Game"}
            </button>
            {!canStart && (
              <p style={{ fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
                {isStartups
                  ? players.length < 3
                    ? "Need at least 3 players for Startups"
                    : "Too many players (max 6 for Startups)"
                  : isFruitBoss
                  ? players.length < 2
                    ? "Need at least 2 players for Fruit Boss"
                    : "Too many players (max 4 for Fruit Boss)"
                  : isTakeTime
                  ? players.length < 2
                    ? "Need at least 2 players for Take Time"
                    : "Too many players (max 4 for Take Time)"
                  : isDeepSea
                  ? players.length < 2
                    ? "Need at least 2 players for Deep Sea Adventure"
                    : "Too many players (max 6 for Deep Sea Adventure)"
                  : isOrderOverload
                  ? players.length < 2
                    ? "Need at least 2 players for Order Overload"
                    : "Too many players (max 6 for Order Overload)"
                  : isWerewords
                    ? players.length < 4
                      ? "Need at least 4 players for Werewords"
                      : "Too many players (max 11 for Werewords)"
                    : isScout
                      ? players.length < 3
                        ? "Need at least 3 players for Scout"
                        : "Too many players (max 5 for Scout)"
                      : !knower
                        ? "Assign a Knower to start"
                        : `Need at least ${minNonKnowers} non-Knower player${minNonKnowers > 1 ? "s" : ""}`}
              </p>
            )}
          </div>
        )}
      </div>

      <ConfirmButton
        label={isHost ? "Disband Room" : "Leave Room"}
        confirmLabel={isHost ? "Disband — sure?" : "Leave — sure?"}
        busyLabel="Leaving…"
        onConfirm={handleLeave}
        style={{ marginTop: "1rem" }}
      />
    </div>
  );
}
