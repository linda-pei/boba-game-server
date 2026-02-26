export interface Player {
  name: string;
  order: number;
}

export interface RoomSettings {
  numRings: number;
  knower?: string;
}

export interface Room {
  host: string;
  status: "lobby" | "in-progress" | "finished";
  gameType: string;
  settings: RoomSettings;
  players: Record<string, Player>;
  maxPlayers: number;
  createdAt: Date;
}

export interface PendingPlay {
  cardId: string;
  playedBy: string;
  rings: number[];
}

export interface PlayedCard {
  playedBy: string;
  rings: number[];
}

export interface Game {
  gameType: string;
  mode: "competitive" | "coop";
  status: "knower-setup" | "in-progress" | "finished";
  knower: string;
  numRings: number;
  rings: { label: string }[];
  ringAssignments: Record<string, number[]>;
  playedCards: Record<string, PlayedCard>;
  pendingPlay: PendingPlay | null;
  deck: string[];
  turnOrder: string[];
  currentTurn: number;
  winner: string | null;
}

export interface Hand {
  cards: string[];
}
