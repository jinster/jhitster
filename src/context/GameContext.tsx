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
  gameMode: 'local' | 'multiplayer';
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
  gameMode: 'local',
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
  | { type: 'RESET' }
  | { type: 'RESOLVE_TURN'; position: number; tokenPlacements: { playerIndex: number; position: number }[] }
  | { type: 'SKIP_SONG' }
  | { type: 'SET_GAME_MODE'; mode: 'local' | 'multiplayer' };

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

/** Find the correct position(s) for a card in a sorted timeline */
export function findCorrectPositions(timeline: Song[], card: Song): number[] {
  const positions: number[] = [];
  for (let i = 0; i <= timeline.length; i++) {
    if (isPlacementCorrect(timeline, card, i)) {
      positions.push(i);
    }
  }
  return positions;
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
        gameMode: state.gameMode,
        players: action.names.map((name) => ({ name, timeline: [], hand: [], tokens: 2 })),
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
          const newTimeline = [...sortedTimeline];
          newTimeline.splice(action.position, 0, state.currentCard!);
          return { ...p, timeline: newTimeline };
        } else {
          const deck = [...state.deck];
          const penaltyCard = deck.pop() ?? null;
          const newHand = penaltyCard ? [...p.hand, penaltyCard] : [...p.hand];
          return { ...p, hand: newHand, timeline: sortedTimeline };
        }
      });

      let deck = [...state.deck];
      if (!correct) {
        deck = deck.slice(0, -1);
      }

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

    case 'RESOLVE_TURN': {
      if (!state.currentCard) return state;

      const card = state.currentCard;
      const activeIdx = state.currentPlayerIndex;
      const activePlayer = state.players[activeIdx];
      const sortedTimeline = [...activePlayer.timeline].sort((a, b) => a.year - b.year);
      const correct = isPlacementCorrect(sortedTimeline, card, action.position);
      const correctPositions = findCorrectPositions(sortedTimeline, card);

      // Find the first token placement on a correct position (excluding the active player's position)
      const stealablePositions = correctPositions.filter(p => p !== action.position);
      let winningSteal: { playerIndex: number; position: number } | null = null;
      for (const tp of action.tokenPlacements) {
        if (stealablePositions.includes(tp.position)) {
          winningSteal = tp;
          break;
        }
      }

      let players = state.players.map((p) => ({ ...p, timeline: [...p.timeline] }));
      let deck = [...state.deck];
      let winner: string | null = state.winner;
      let phase: GamePhase = state.phase;

      // Deduct tokens from all players who used tokens
      for (const tp of action.tokenPlacements) {
        players[tp.playerIndex] = {
          ...players[tp.playerIndex],
          tokens: players[tp.playerIndex].tokens - 1,
        };
      }

      if (correct && winningSteal) {
        // Correct placement but stolen — card goes to stealer's timeline
        const stealerIdx = winningSteal.playerIndex;
        const stealerTimeline = [...players[stealerIdx].timeline].sort((a, b) => a.year - b.year);
        // Insert card at its correct position in stealer's timeline
        const stealerCorrectPositions = findCorrectPositions(stealerTimeline, card);
        const insertPos = stealerCorrectPositions.length > 0 ? stealerCorrectPositions[0] : stealerTimeline.length;
        stealerTimeline.splice(insertPos, 0, card);
        players[stealerIdx] = { ...players[stealerIdx], timeline: stealerTimeline };
        // Check win for stealer
        if (stealerTimeline.length >= state.targetTimelineLength) {
          phase = 'victory';
          winner = players[stealerIdx].name;
        }
      } else if (correct && !winningSteal) {
        // Correct, no steal — card goes to active player's timeline
        const newTimeline = [...sortedTimeline];
        newTimeline.splice(action.position, 0, card);
        players[activeIdx] = { ...players[activeIdx], timeline: newTimeline };
        // Check win for active player
        if (newTimeline.length >= state.targetTimelineLength) {
          phase = 'victory';
          winner = players[activeIdx].name;
        }
      } else if (!correct && winningSteal) {
        // Wrong placement, but a stealer got it right — card goes to stealer
        const stealerIdx = winningSteal.playerIndex;
        const stealerTimeline = [...players[stealerIdx].timeline].sort((a, b) => a.year - b.year);
        const stealerCorrectPositions = findCorrectPositions(stealerTimeline, card);
        const insertPos = stealerCorrectPositions.length > 0 ? stealerCorrectPositions[0] : stealerTimeline.length;
        stealerTimeline.splice(insertPos, 0, card);
        players[stealerIdx] = { ...players[stealerIdx], timeline: stealerTimeline };
        // No penalty for active player when stolen
        if (stealerTimeline.length >= state.targetTimelineLength) {
          phase = 'victory';
          winner = players[stealerIdx].name;
        }
      } else {
        // Wrong, no steal — card discarded, active player draws penalty
        const penaltyCard = deck.pop() ?? null;
        if (penaltyCard) {
          players[activeIdx] = {
            ...players[activeIdx],
            hand: [...players[activeIdx].hand, penaltyCard],
          };
        }
      }

      return {
        ...state,
        players,
        deck,
        currentCard: null,
        phase,
        winner,
      };
    }

    case 'SKIP_SONG': {
      if (!state.currentCard) return state;
      const activeIdx = state.currentPlayerIndex;
      const players = state.players.map((p, i) => {
        if (i !== activeIdx) return p;
        return { ...p, tokens: p.tokens - 1 };
      });
      // Discard current card, draw a new one
      const deck = [...state.deck];
      const currentCard = deck.pop() ?? null;
      return { ...state, players, deck, currentCard };
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

    case 'SET_GAME_MODE': {
      return { ...state, gameMode: action.mode };
    }

    case 'RESET': {
      return {
        ...initialState,
        selectedPackIds: state.selectedPackIds,
        songs: state.songs,
        gameMode: state.gameMode,
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
  resolveTurn: (position: number, tokenPlacements: { playerIndex: number; position: number }[]) => void;
  skipSong: () => void;
  nextTurn: () => void;
  resetGame: () => void;
  setGameMode: (mode: 'local' | 'multiplayer') => void;
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
    resolveTurn: (position, tokenPlacements) =>
      dispatch({ type: 'RESOLVE_TURN', position, tokenPlacements }),
    skipSong: () => dispatch({ type: 'SKIP_SONG' }),
    nextTurn: () => dispatch({ type: 'NEXT_TURN' }),
    resetGame: () => dispatch({ type: 'RESET' }),
    setGameMode: (mode) => dispatch({ type: 'SET_GAME_MODE', mode }),
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
