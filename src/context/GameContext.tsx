import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Song, Player, GamePhase } from '../types';

// ── State ──────────────────────────────────────────────

export interface GameState {
  players: Player[];
  deck: Song[];
  currentPlayerIndex: number;
  currentCard: Song | null;
  phase: GamePhase;
  targetTimelineLength: number;
  winner: string | null;
  selectedPackIds: string[];
  songs: Song[];
}

export const initialState: GameState = {
  players: [],
  deck: [],
  currentPlayerIndex: 0,
  currentCard: null,
  phase: 'setup',
  targetTimelineLength: 10,
  winner: null,
  selectedPackIds: [],
  songs: [],
};

// ── Actions ────────────────────────────────────────────

export type GameAction =
  | { type: 'SET_PACKS'; packIds: string[]; songs: Song[] }
  | { type: 'SET_PLAYERS'; names: string[] }
  | { type: 'DEAL_INITIAL_CARDS'; cardsPerHand: number }
  | { type: 'DRAW_CARD' }
  | { type: 'PLACE_CARD'; position: number }
  | { type: 'NEXT_TURN' }
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'RESET' };

// ── Helpers ────────────────────────────────────────────

export function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function isPlacementCorrect(timeline: Song[], card: Song, position: number): boolean {
  const before = position > 0 ? timeline[position - 1] : null;
  const after = position < timeline.length ? timeline[position] : null;

  if (before && card.year < before.year) return false;
  if (after && card.year > after.year) return false;
  return true;
}

// ── Reducer ────────────────────────────────────────────

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PACKS': {
      return {
        ...state,
        selectedPackIds: action.packIds,
        songs: action.songs,
      };
    }

    case 'SET_PLAYERS': {
      const deck = shuffle(state.songs);
      return {
        ...initialState,
        selectedPackIds: state.selectedPackIds,
        songs: state.songs,
        players: action.names.map((name) => ({ name, timeline: [], hand: [] })),
        deck,
        phase: 'setup',
      };
    }

    case 'DEAL_INITIAL_CARDS': {
      const deck = [...state.deck];
      const players = state.players.map((p) => ({
        ...p,
        timeline: [...p.timeline],
        hand: [...p.hand],
      }));

      // Deal 1 face-up card to each player's timeline
      for (const player of players) {
        const card = deck.pop();
        if (card) player.timeline.push(card);
      }

      // Deal hand cards
      for (const player of players) {
        for (let i = 0; i < action.cardsPerHand; i++) {
          const card = deck.pop();
          if (card) player.hand.push(card);
        }
      }

      // Draw the first current card
      const currentCard = deck.pop() ?? null;

      return {
        ...state,
        players,
        deck,
        currentCard,
        currentPlayerIndex: 0,
        phase: 'playing',
      };
    }

    case 'DRAW_CARD': {
      const deck = [...state.deck];
      const currentCard = deck.pop() ?? null;
      return { ...state, deck, currentCard };
    }

    case 'PLACE_CARD': {
      if (!state.currentCard) return state;

      const player = state.players[state.currentPlayerIndex];
      const sortedTimeline = [...player.timeline].sort((a, b) => a.year - b.year);
      const correct = isPlacementCorrect(sortedTimeline, state.currentCard, action.position);

      const players = state.players.map((p, i) => {
        if (i !== state.currentPlayerIndex) return p;
        if (correct) {
          // Insert card into timeline at the correct position
          const newTimeline = [...sortedTimeline];
          newTimeline.splice(action.position, 0, state.currentCard!);
          return { ...p, timeline: newTimeline };
        } else {
          // Incorrect: card is discarded, draw a penalty card from deck
          const deck = [...state.deck];
          const penaltyCard = deck.pop() ?? null;
          const newHand = penaltyCard ? [...p.hand, penaltyCard] : [...p.hand];
          // We need to update deck in outer scope — handled below
          return { ...p, hand: newHand, timeline: sortedTimeline };
        }
      });

      // If incorrect, we also need to remove the penalty card from the deck
      let deck = [...state.deck];
      if (!correct) {
        deck = deck.slice(0, -1);
      }

      // Check win condition
      const updatedPlayer = players[state.currentPlayerIndex];
      const won = correct && updatedPlayer.timeline.length >= state.targetTimelineLength;

      return {
        ...state,
        players,
        deck,
        currentCard: null,
        phase: won ? 'victory' : state.phase,
        winner: won ? updatedPlayer.name : state.winner,
      };
    }

    case 'NEXT_TURN': {
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      const deck = [...state.deck];
      const currentCard = deck.pop() ?? null;
      return {
        ...state,
        currentPlayerIndex: nextIndex,
        deck,
        currentCard,
      };
    }

    case 'SET_PHASE': {
      return { ...state, phase: action.phase };
    }

    case 'RESET': {
      return {
        ...initialState,
        selectedPackIds: state.selectedPackIds,
        songs: state.songs,
      };
    }

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  setPacks: (packIds: string[], songs: Song[]) => void;
  setPlayers: (names: string[]) => void;
  dealInitialCards: (cardsPerHand?: number) => void;
  drawCard: () => void;
  placeCard: (position: number) => void;
  nextTurn: () => void;
  resetGame: () => void;
  isPlacementCorrect: (timeline: Song[], card: Song, position: number) => boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const value: GameContextValue = {
    state,
    dispatch,
    setPacks: (packIds, songs) => dispatch({ type: 'SET_PACKS', packIds, songs }),
    setPlayers: (names) => dispatch({ type: 'SET_PLAYERS', names }),
    dealInitialCards: (cardsPerHand = 0) =>
      dispatch({ type: 'DEAL_INITIAL_CARDS', cardsPerHand }),
    drawCard: () => dispatch({ type: 'DRAW_CARD' }),
    placeCard: (position) => dispatch({ type: 'PLACE_CARD', position }),
    nextTurn: () => dispatch({ type: 'NEXT_TURN' }),
    resetGame: () => dispatch({ type: 'RESET' }),
    isPlacementCorrect,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
