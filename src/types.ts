export interface Song {
  id: number;
  title: string;
  artist: string;
  year: number;
  previewUrl?: string | null;
}

export interface Player {
  name: string;
  timeline: Song[];
  hand: Song[];
  tokens: number;
}

export type GamePhase = 'setup' | 'playing' | 'victory';

export interface SongPack {
  id: string;
  name: string;
  description: string;
  songCount: number;
  yearRange: [number, number];
  hasAudio: boolean;
}

// ── Multiplayer message types ──────────────────────────

export interface StealResult {
  playerIndex: number;
  playerName: string;
}

// Host → Guest messages
export type HostMessage =
  | { type: 'GAME_STATE'; players: Player[]; currentPlayerIndex: number; phase: GamePhase; targetTimelineLength: number; deckSize: number }
  | { type: 'YOUR_TURN'; timeline: Song[]; currentCard: Song | null; tokens: number }
  | { type: 'TOKEN_WINDOW'; timeline: Song[]; card: Song; timeRemaining: number; takenPositions: number[] }
  | { type: 'TURN_RESULT'; wasCorrect: boolean; card: Song; stealResult: StealResult | null }
  | { type: 'GAME_OVER'; winner: string }
  | { type: 'PLAYER_ASSIGNMENT'; playerIndex: number; playerName: string }
  | { type: 'AUDIO_SYNC'; previewUrl: string | null; playing: boolean }
  | { type: 'PENDING_PLACEMENT'; position: number | null; timeline: Song[] }

// Guest → Host messages
export type GuestMessage =
  | { type: 'CONFIRM_PLACEMENT'; position: number }
  | { type: 'CANCEL_PLACEMENT' }
  | { type: 'USE_TOKEN'; position: number }
  | { type: 'SKIP_SONG' }
  | { type: 'JOIN'; requestedName: string }
  | { type: 'PENDING_POSITION'; position: number | null }
