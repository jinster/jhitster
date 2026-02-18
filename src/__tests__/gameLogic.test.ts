import { describe, it, expect } from 'vitest';
import {
  shuffle,
  isPlacementCorrect,
  gameReducer,
  initialState,
  type GameState,
} from '../context/GameContext';
import type { Song } from '../types';

// ── Test data ──────────────────────────────────────────

const song1960: Song = { id: 1, title: 'Song 1960', artist: 'A', year: 1960 };
const song1970: Song = { id: 2, title: 'Song 1970', artist: 'B', year: 1970 };
const song1980: Song = { id: 3, title: 'Song 1980', artist: 'C', year: 1980 };
const song1990: Song = { id: 4, title: 'Song 1990', artist: 'D', year: 1990 };
const song2000: Song = { id: 5, title: 'Song 2000', artist: 'E', year: 2000 };

// ── shuffle ────────────────────────────────────────────

describe('shuffle', () => {
  it('returns a new array with the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect(result.sort()).toEqual(input.sort());
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it('handles an empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles a single-element array', () => {
    expect(shuffle([42])).toEqual([42]);
  });
});

// ── isPlacementCorrect ─────────────────────────────────

describe('isPlacementCorrect', () => {
  const timeline = [song1960, song1980, song2000];

  it('correct: placing 1970 between 1960 and 1980 (position 1)', () => {
    expect(isPlacementCorrect(timeline, song1970, 1)).toBe(true);
  });

  it('correct: placing 1990 between 1980 and 2000 (position 2)', () => {
    expect(isPlacementCorrect(timeline, song1990, 2)).toBe(true);
  });

  it('correct: placing before the first card (position 0)', () => {
    const earlyCard: Song = { id: 99, title: 'Early', artist: 'X', year: 1950 };
    expect(isPlacementCorrect(timeline, earlyCard, 0)).toBe(true);
  });

  it('correct: placing after the last card (position 3)', () => {
    const lateCard: Song = { id: 99, title: 'Late', artist: 'X', year: 2020 };
    expect(isPlacementCorrect(timeline, lateCard, 3)).toBe(true);
  });

  it('incorrect: placing 2000 at position 0 (before 1960)', () => {
    expect(isPlacementCorrect(timeline, song2000, 0)).toBe(false);
  });

  it('incorrect: placing 1960 at position 3 (after 2000)', () => {
    expect(isPlacementCorrect(timeline, song1960, 3)).toBe(false);
  });

  it('correct: placing on empty timeline', () => {
    expect(isPlacementCorrect([], song1980, 0)).toBe(true);
  });

  it('correct: placing same year adjacent', () => {
    const sameYearCard: Song = { id: 99, title: 'Same', artist: 'X', year: 1980 };
    expect(isPlacementCorrect(timeline, sameYearCard, 1)).toBe(true);
    expect(isPlacementCorrect(timeline, sameYearCard, 2)).toBe(true);
  });
});

// ── gameReducer ────────────────────────────────────────

describe('gameReducer', () => {
  describe('SET_PLAYERS', () => {
    it('initializes players with names and empty timelines/hands', () => {
      const state = gameReducer(initialState, {
        type: 'SET_PLAYERS',
        names: ['Alice', 'Bob'],
      });
      expect(state.players).toHaveLength(2);
      expect(state.players[0].name).toBe('Alice');
      expect(state.players[1].name).toBe('Bob');
      expect(state.players[0].timeline).toEqual([]);
      expect(state.players[0].hand).toEqual([]);
    });

    it('shuffles the deck', () => {
      const state = gameReducer(initialState, {
        type: 'SET_PLAYERS',
        names: ['Alice', 'Bob'],
      });
      expect(state.deck.length).toBeGreaterThan(0);
    });
  });

  describe('DEAL_INITIAL_CARDS', () => {
    it('deals 1 timeline card per player and draws a current card', () => {
      let state = gameReducer(initialState, {
        type: 'SET_PLAYERS',
        names: ['Alice', 'Bob'],
      });
      const deckBefore = state.deck.length;

      state = gameReducer(state, {
        type: 'DEAL_INITIAL_CARDS',
        cardsPerHand: 0,
      });

      expect(state.players[0].timeline).toHaveLength(1);
      expect(state.players[1].timeline).toHaveLength(1);
      expect(state.currentCard).not.toBeNull();
      // 2 timeline cards + 1 current card = 3 drawn
      expect(state.deck.length).toBe(deckBefore - 3);
      expect(state.phase).toBe('playing');
    });
  });

  describe('PLACE_CARD (correct)', () => {
    it('adds card to timeline when placement is correct', () => {
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960, song2000], hand: [] },
          { name: 'Bob', timeline: [song1970], hand: [] },
        ],
        deck: [song1990],
        currentCard: song1980,
        currentPlayerIndex: 0,
      };

      // Place 1980 between 1960 and 2000 — sorted timeline is [1960, 2000], position 1
      const next = gameReducer(state, { type: 'PLACE_CARD', position: 1 });

      expect(next.players[0].timeline).toHaveLength(3);
      expect(next.players[0].timeline.map((s) => s.year)).toEqual([1960, 1980, 2000]);
      expect(next.currentCard).toBeNull();
    });
  });

  describe('PLACE_CARD (incorrect)', () => {
    it('discards card and draws penalty on wrong placement', () => {
      const penaltyCard: Song = { id: 99, title: 'Penalty', artist: 'X', year: 2010 };
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960, song2000], hand: [] },
        ],
        deck: [penaltyCard],
        currentCard: song1980,
        currentPlayerIndex: 0,
      };

      // Place 1980 at position 0 (before 1960) — wrong!
      const next = gameReducer(state, { type: 'PLACE_CARD', position: 0 });

      // Card should NOT be in timeline
      expect(next.players[0].timeline).toHaveLength(2);
      // Player draws penalty card
      expect(next.players[0].hand).toHaveLength(1);
      expect(next.currentCard).toBeNull();
    });
  });

  describe('WIN DETECTION', () => {
    it('sets phase to victory when timeline reaches target length', () => {
      const timelineCards: Song[] = Array.from({ length: 9 }, (_, i) => ({
        id: i + 10,
        title: `Song ${1960 + i * 5}`,
        artist: 'X',
        year: 1960 + i * 5,
      }));

      const winningCard: Song = { id: 100, title: 'Winner', artist: 'X', year: 2020 };

      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [{ name: 'Alice', timeline: timelineCards, hand: [] }],
        deck: [],
        currentCard: winningCard,
        currentPlayerIndex: 0,
        targetTimelineLength: 10,
      };

      // Place at end — should be correct (2020 > all others)
      const next = gameReducer(state, { type: 'PLACE_CARD', position: 9 });

      expect(next.phase).toBe('victory');
      expect(next.winner).toBe('Alice');
      expect(next.players[0].timeline).toHaveLength(10);
    });

    it('does not trigger victory on incorrect placement', () => {
      const timelineCards: Song[] = Array.from({ length: 9 }, (_, i) => ({
        id: i + 10,
        title: `Song ${1960 + i * 5}`,
        artist: 'X',
        year: 1960 + i * 5,
      }));

      const card: Song = { id: 100, title: 'Card', artist: 'X', year: 2020 };

      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [{ name: 'Alice', timeline: timelineCards, hand: [] }],
        deck: [],
        currentCard: card,
        currentPlayerIndex: 0,
        targetTimelineLength: 10,
      };

      // Place at position 0 (before 1960) — wrong!
      const next = gameReducer(state, { type: 'PLACE_CARD', position: 0 });

      expect(next.phase).toBe('playing');
      expect(next.winner).toBeNull();
    });
  });

  describe('NEXT_TURN', () => {
    it('advances to next player and draws a card', () => {
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960], hand: [] },
          { name: 'Bob', timeline: [song1970], hand: [] },
        ],
        deck: [song1990, song2000],
        currentCard: null,
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, { type: 'NEXT_TURN' });

      expect(next.currentPlayerIndex).toBe(1);
      expect(next.currentCard).not.toBeNull();
      expect(next.deck.length).toBe(state.deck.length - 1);
    });

    it('wraps around to player 0', () => {
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [], hand: [] },
          { name: 'Bob', timeline: [], hand: [] },
        ],
        deck: [song1990],
        currentCard: null,
        currentPlayerIndex: 1,
      };

      const next = gameReducer(state, { type: 'NEXT_TURN' });
      expect(next.currentPlayerIndex).toBe(0);
    });
  });

  describe('CHALLENGE_PENALTY', () => {
    it('makes the specified player draw a penalty card', () => {
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960], hand: [] },
          { name: 'Bob', timeline: [song1970], hand: [] },
        ],
        deck: [song1990],
        currentCard: song1980,
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, { type: 'CHALLENGE_PENALTY', playerIndex: 1 });

      expect(next.players[1].hand).toHaveLength(1);
      expect(next.deck.length).toBe(0);
    });
  });

  describe('RESET', () => {
    it('returns to initial state', () => {
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [{ name: 'Alice', timeline: [song1960], hand: [] }],
        deck: [song1990],
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, { type: 'RESET' });

      expect(next.players).toEqual([]);
      expect(next.deck).toEqual([]);
      expect(next.phase).toBe('setup');
      expect(next.currentCard).toBeNull();
    });
  });
});
