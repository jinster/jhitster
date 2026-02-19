import { describe, it, expect } from 'vitest';
import {
  shuffle,
  isPlacementCorrect,
  findCorrectPositions,
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

const testSongs: Song[] = [song1960, song1970, song1980, song1990, song2000];

/** Helper: create a state with packs loaded */
function stateWithPacks(songs: Song[] = testSongs): GameState {
  return gameReducer(initialState, {
    type: 'SET_PACKS',
    packIds: ['test-pack'],
    songs,
  });
}

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

// ── findCorrectPositions ───────────────────────────────

describe('findCorrectPositions', () => {
  it('finds all correct positions for a card', () => {
    const timeline = [song1960, song1980, song2000];
    expect(findCorrectPositions(timeline, song1970)).toEqual([1]);
    expect(findCorrectPositions(timeline, song1990)).toEqual([2]);
  });

  it('returns multiple positions for same-year cards', () => {
    const timeline = [song1960, song1980, song2000];
    const sameYear: Song = { id: 99, title: 'Same', artist: 'X', year: 1980 };
    const positions = findCorrectPositions(timeline, sameYear);
    expect(positions).toContain(1);
    expect(positions).toContain(2);
  });

  it('returns [0] for empty timeline', () => {
    expect(findCorrectPositions([], song1980)).toEqual([0]);
  });
});

// ── gameReducer ────────────────────────────────────────

describe('gameReducer', () => {
  describe('SET_PACKS', () => {
    it('stores pack IDs and merged songs', () => {
      const state = gameReducer(initialState, {
        type: 'SET_PACKS',
        packIds: ['pack-a', 'pack-b'],
        songs: testSongs,
      });
      expect(state.selectedPackIds).toEqual(['pack-a', 'pack-b']);
      expect(state.songs).toHaveLength(5);
      expect(state.songs[0].title).toBe('Song 1960');
    });
  });

  describe('SET_PLAYERS', () => {
    it('initializes players with names, empty timelines/hands, and 2 tokens', () => {
      let state = stateWithPacks();
      state = gameReducer(state, {
        type: 'SET_PLAYERS',
        names: ['Alice', 'Bob'],
      });
      expect(state.players).toHaveLength(2);
      expect(state.players[0].name).toBe('Alice');
      expect(state.players[1].name).toBe('Bob');
      expect(state.players[0].timeline).toEqual([]);
      expect(state.players[0].hand).toEqual([]);
      expect(state.players[0].tokens).toBe(2);
      expect(state.players[1].tokens).toBe(2);
    });

    it('shuffles the deck from loaded songs', () => {
      let state = stateWithPacks();
      state = gameReducer(state, {
        type: 'SET_PLAYERS',
        names: ['Alice', 'Bob'],
      });
      expect(state.deck.length).toBe(testSongs.length);
    });

    it('preserves selectedPackIds and songs', () => {
      let state = stateWithPacks();
      state = gameReducer(state, {
        type: 'SET_PLAYERS',
        names: ['Alice'],
      });
      expect(state.selectedPackIds).toEqual(['test-pack']);
      expect(state.songs).toHaveLength(5);
    });
  });

  describe('DEAL_INITIAL_CARDS', () => {
    it('deals 1 timeline card per player and draws a current card', () => {
      let state = stateWithPacks();
      state = gameReducer(state, {
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
          { name: 'Alice', timeline: [song1960, song2000], hand: [], tokens: 2 },
          { name: 'Bob', timeline: [song1970], hand: [], tokens: 2 },
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
          { name: 'Alice', timeline: [song1960, song2000], hand: [], tokens: 2 },
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

  describe('RESOLVE_TURN', () => {
    it('correct placement, no steals — card goes to active player', () => {
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960, song2000], hand: [], tokens: 2 },
          { name: 'Bob', timeline: [song1970], hand: [], tokens: 2 },
        ],
        deck: [song1990],
        currentCard: song1980,
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, {
        type: 'RESOLVE_TURN',
        position: 1, // between 1960 and 2000 — correct
        tokenPlacements: [],
      });

      expect(next.players[0].timeline).toHaveLength(3);
      expect(next.players[0].timeline.map((s) => s.year)).toEqual([1960, 1980, 2000]);
      expect(next.currentCard).toBeNull();
    });

    it('wrong placement, no steals — card discarded, penalty drawn', () => {
      const penaltyCard: Song = { id: 99, title: 'Penalty', artist: 'X', year: 2010 };
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960, song2000], hand: [], tokens: 2 },
          { name: 'Bob', timeline: [song1970], hand: [], tokens: 2 },
        ],
        deck: [penaltyCard],
        currentCard: song1980,
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, {
        type: 'RESOLVE_TURN',
        position: 0, // before 1960 — wrong
        tokenPlacements: [],
      });

      expect(next.players[0].timeline).toHaveLength(2);
      expect(next.players[0].hand).toHaveLength(1);
      expect(next.players[0].hand[0].title).toBe('Penalty');
    });

    it('correct placement, successful steal — card goes to stealer', () => {
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960, song2000], hand: [], tokens: 2 },
          { name: 'Bob', timeline: [song1970], hand: [], tokens: 2 },
        ],
        deck: [song1990],
        currentCard: song1980,
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, {
        type: 'RESOLVE_TURN',
        position: 1, // correct
        tokenPlacements: [{ playerIndex: 1, position: 1 }], // Bob steals at position 1 (also correct)
      });

      // Card goes to Bob (stealer), not Alice
      expect(next.players[0].timeline).toHaveLength(2); // Alice still has 2
      expect(next.players[1].timeline).toHaveLength(2); // Bob now has 2 (song1970 + song1980)
      expect(next.players[1].tokens).toBe(1); // Bob spent a token
    });

    it('correct placement, failed steal — card stays with active player', () => {
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960, song2000], hand: [], tokens: 2 },
          { name: 'Bob', timeline: [song1970], hand: [], tokens: 2 },
        ],
        deck: [song1990],
        currentCard: song1980,
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, {
        type: 'RESOLVE_TURN',
        position: 1, // correct
        tokenPlacements: [{ playerIndex: 1, position: 0 }], // Bob guesses position 0 — wrong
      });

      // Card stays with Alice
      expect(next.players[0].timeline).toHaveLength(3);
      expect(next.players[1].timeline).toHaveLength(1); // Bob unchanged
      expect(next.players[1].tokens).toBe(1); // But Bob still loses a token
    });

    it('wrong placement, successful steal — card goes to stealer, no penalty for active', () => {
      const penaltyCard: Song = { id: 99, title: 'Penalty', artist: 'X', year: 2010 };
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960, song2000], hand: [], tokens: 2 },
          { name: 'Bob', timeline: [song1970], hand: [], tokens: 2 },
        ],
        deck: [penaltyCard],
        currentCard: song1980,
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, {
        type: 'RESOLVE_TURN',
        position: 0, // wrong
        tokenPlacements: [{ playerIndex: 1, position: 1 }], // Bob guesses position 1 — correct on Alice's timeline
      });

      // Alice doesn't get card, and no penalty
      expect(next.players[0].timeline).toHaveLength(2);
      expect(next.players[0].hand).toHaveLength(0);
      // Bob gets the card
      expect(next.players[1].timeline).toHaveLength(2);
      expect(next.players[1].tokens).toBe(1);
    });

    it('deducts tokens from all players who used them', () => {
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960, song2000], hand: [], tokens: 2 },
          { name: 'Bob', timeline: [song1970], hand: [], tokens: 2 },
          { name: 'Carol', timeline: [song1990], hand: [], tokens: 2 },
        ],
        deck: [],
        currentCard: song1980,
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, {
        type: 'RESOLVE_TURN',
        position: 1,
        tokenPlacements: [
          { playerIndex: 1, position: 0 }, // Bob — wrong position
          { playerIndex: 2, position: 2 }, // Carol — wrong position
        ],
      });

      expect(next.players[1].tokens).toBe(1);
      expect(next.players[2].tokens).toBe(1);
    });

    it('triggers win for stealer if their timeline reaches target', () => {
      const timelineCards: Song[] = Array.from({ length: 9 }, (_, i) => ({
        id: i + 10,
        title: `Song ${1950 + i * 5}`,
        artist: 'X',
        year: 1950 + i * 5,
      }));

      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960, song2000], hand: [], tokens: 2 },
          { name: 'Bob', timeline: timelineCards, hand: [], tokens: 2 },
        ],
        deck: [],
        currentCard: song1980,
        currentPlayerIndex: 0,
        targetTimelineLength: 10,
      };

      const next = gameReducer(state, {
        type: 'RESOLVE_TURN',
        position: 1,
        tokenPlacements: [{ playerIndex: 1, position: 1 }],
      });

      expect(next.phase).toBe('victory');
      expect(next.winner).toBe('Bob');
    });
  });

  describe('SKIP_SONG', () => {
    it('deducts a token from active player and draws a new card', () => {
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960], hand: [], tokens: 2 },
          { name: 'Bob', timeline: [song1970], hand: [], tokens: 2 },
        ],
        deck: [song1990, song2000],
        currentCard: song1980,
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, { type: 'SKIP_SONG' });

      expect(next.players[0].tokens).toBe(1);
      expect(next.currentCard).not.toBeNull();
      expect(next.currentCard!.id).not.toBe(song1980.id);
      expect(next.deck.length).toBe(state.deck.length - 1);
    });

    it('does nothing when no current card', () => {
      const state: GameState = {
        ...initialState,
        phase: 'playing',
        players: [
          { name: 'Alice', timeline: [song1960], hand: [], tokens: 2 },
        ],
        deck: [],
        currentCard: null,
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, { type: 'SKIP_SONG' });
      expect(next).toBe(state);
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
        players: [{ name: 'Alice', timeline: timelineCards, hand: [], tokens: 2 }],
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
        players: [{ name: 'Alice', timeline: timelineCards, hand: [], tokens: 2 }],
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
          { name: 'Alice', timeline: [song1960], hand: [], tokens: 2 },
          { name: 'Bob', timeline: [song1970], hand: [], tokens: 2 },
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
          { name: 'Alice', timeline: [], hand: [], tokens: 2 },
          { name: 'Bob', timeline: [], hand: [], tokens: 2 },
        ],
        deck: [song1990],
        currentCard: null,
        currentPlayerIndex: 1,
      };

      const next = gameReducer(state, { type: 'NEXT_TURN' });
      expect(next.currentPlayerIndex).toBe(0);
    });
  });

  describe('SET_GAME_MODE', () => {
    it('sets the game mode', () => {
      const state = gameReducer(initialState, { type: 'SET_GAME_MODE', mode: 'multiplayer' });
      expect(state.gameMode).toBe('multiplayer');
    });
  });

  describe('RESET', () => {
    it('returns to initial state but preserves packs and gameMode', () => {
      let state = stateWithPacks();
      state = gameReducer(state, { type: 'SET_GAME_MODE', mode: 'multiplayer' });
      state = gameReducer(state, {
        type: 'SET_PLAYERS',
        names: ['Alice'],
      });
      state = {
        ...state,
        phase: 'playing' as const,
        currentPlayerIndex: 0,
      };

      const next = gameReducer(state, { type: 'RESET' });

      expect(next.players).toEqual([]);
      expect(next.deck).toEqual([]);
      expect(next.phase).toBe('setup');
      expect(next.currentCard).toBeNull();
      // Packs preserved
      expect(next.selectedPackIds).toEqual(['test-pack']);
      expect(next.songs).toHaveLength(5);
      // Game mode preserved
      expect(next.gameMode).toBe('multiplayer');
    });
  });
});
