# JHitster - Product Requirements Document

## Overview
JHitster is a browser-based timeline card game inspired by Hitster. Players take turns guessing the release year of songs, placing them in chronological order on their personal timeline. The first player to correctly place a target number of cards wins.

## Tech Stack
- Vite + React 19 + TypeScript
- Tailwind CSS v4
- React Router (HashRouter)
- Framer Motion (animations)
- canvas-confetti (victory celebration)

## Architecture
- All game state managed via React context (no backend)
- Song data loaded from a local JSON file
- Mobile-first responsive design

---

## Task List (ordered by priority)

### Phase 2: Core Data & State

- [x] **Task 1: Song data file** — Create `src/data/songs.json` with at least 50 songs (title, artist, year) spanning 1960–2024. Create a TypeScript type `Song` in `src/types.ts`.
- [x] **Task 2: Game state context** — Create `src/context/GameContext.tsx` with React context providing: players (name, hand, timeline), deck, current player index, current card, game phase (setup | playing | victory), and actions (dealInitialCards, drawCard, placeCard, nextTurn, challenge). Wire it into `App.tsx`.
- [x] **Task 3: Wire PlayerSetup to context** — Update `PlayerSetup.tsx` to write player names into GameContext and navigate to `/deal`.

### Phase 3: Game Initialization

- [x] **Task 4: Deck shuffle & deal** — In `GameInitScreen.tsx`, shuffle the deck, deal 1 face-up card to each player's timeline plus a hand of cards, then navigate to `/play`. Show a brief dealing animation.

### Phase 4: Core Game Loop

- [x] **Task 5: Timeline display component** — Create `src/components/Timeline.tsx` that renders a horizontal scrollable row of cards sorted by year. Each card shows title + artist (and year if face-up). Include drop zones between cards for placement.
- [x] **Task 6: Current card & placement** — In `GameScreen.tsx`, show the current player's name, their timeline, and the drawn card (face-down initially). Player taps a drop zone to place the card. Reveal the year and highlight correct/incorrect.
- [x] **Task 7: Turn resolution & challenge** — After placement: if correct, card stays and turn ends. If incorrect, card is discarded and player draws a penalty card. Other players can challenge (claim the placement is wrong). Implement the challenge flow.
- [x] **Task 8: Next turn cycling** — Advance to the next player, draw a new card from the deck, and update the UI.

### Phase 5: Win Condition & Victory

- [x] **Task 9: Win detection** — After each successful placement, check if the current player's timeline has reached the target length (e.g., 10 cards). If so, navigate to `/victory`.
- [x] **Task 10: Victory screen** — Update `VictoryPage.tsx` to show the winner's name, their completed timeline, confetti animation, and a "Play Again" button that resets state.

### Phase 6: Polish & QA

- [x] **Task 11: Responsive layout & mobile UX** — Ensure all screens work well on mobile. Add touch-friendly interactions for timeline placement.
- [x] **Task 12: Error boundaries & edge cases** — Handle empty deck, all players eliminated, browser refresh (warn before losing state).
- [x] **Task 13: Add Vitest unit tests** — Install Vitest, add tests for game logic (shuffle, placement validation, win detection, challenge resolution).

---

## Completion Criteria
All tasks checked off, `tsc` passes with no errors, and the app builds successfully with `npm run build`.
