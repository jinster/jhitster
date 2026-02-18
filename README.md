# JHitster

A multiplayer music timeline guessing game. Listen to song previews, guess the release year, and build the longest chronologically correct timeline to win.

## How It Works

1. **Pick your packs** -- choose from curated song collections (US Chart Toppers, Billboard Hot 100, K-Pop Hits)
2. **Add players** -- 2-8 players take turns
3. **Listen & place** -- each turn, a song preview plays and you tap where it belongs on your timeline
4. **Confirm or cancel** -- a two-step placement prevents accidental taps on mobile
5. **Reveal** -- the real year is shown; correct placements stay, wrong ones are discarded with a penalty card drawn
6. **Win** -- first player to reach 10 cards in their timeline wins

Songs without a bundled audio preview are looked up on-demand via the iTunes Search API, so every song gets a 30-second clip when available.

## Song Packs

| Pack | Songs | Years | Audio |
|------|------:|-------|-------|
| US Chart Toppers | 60 | 1963-2024 | Bundled |
| Billboard Year-End Hot 100 | 6,057 | 1959-2024 | iTunes lookup |
| K-Pop Hits | 500 | 1986-2024 | iTunes lookup |

Packs are code-split and lazy-loaded, so only selected packs are downloaded.

## Tech Stack

- **React 19** + React Router 7
- **TypeScript 5.9**
- **Vite 7** (dev server + build)
- **Tailwind CSS 4** (mobile-first responsive design)
- **Framer Motion** (animations)
- **Vitest** (unit tests)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173/jhitster/](http://localhost:5173/jhitster/) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run scrape-billboard` | Re-scrape Billboard data from Wikipedia |
| `npm run fetch-previews` | Fetch iTunes preview URLs for US Chart Toppers |

## Project Structure

```
src/
  pages/            Route screens (Title, PackSelection, PlayerSetup, GameInit, Game, Victory)
  components/       Timeline, AudioPlayer, ErrorBoundary
  context/          GameContext (reducer-based state management)
  hooks/            useItunesPreview (on-demand iTunes API lookup with caching)
  data/packs/       Song pack JSON files + registry with lazy loaders
  types.ts          Song, Player, GamePhase, SongPack interfaces
scripts/
  scrape-billboard.mjs   Wikipedia scraper for Billboard Year-End Hot 100
  fetch-previews.mjs     iTunes preview URL fetcher
```
