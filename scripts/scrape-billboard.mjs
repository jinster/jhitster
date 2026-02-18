#!/usr/bin/env node

/**
 * Scrapes Wikipedia "Billboard Year-End Hot 100 singles" pages (1946–2024)
 * using the MediaWiki API (wikitext format).
 *
 * Output: src/data/packs/billboard-hits.json
 * IDs start at 10001 to avoid collision with us-chart-toppers (1–60).
 * No previewUrl — the app's on-demand iTunes lookup fetches audio at game time.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '..', 'src', 'data', 'packs', 'billboard-hits.json');

const START_YEAR = 1946;
const END_YEAR = 2024;
const DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch wikitext for a given page title via MediaWiki API.
 */
async function fetchWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&formatversion=2`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.parse?.wikitext ?? null;
}

/**
 * Try multiple Wikipedia title patterns for a given year.
 */
function getTitleCandidates(year) {
  // Post-1955: "Billboard Year-End Hot 100 singles of YYYY"
  // Pre-1956: Various naming conventions
  return [
    `Billboard Year-End Hot 100 singles of ${year}`,
    `Billboard year-end top 30 singles of ${year}`,
    `Billboard year-end top 50 singles of ${year}`,
    `Billboard Year-End Hot 100 singles of ${year}`,
  ];
}

/**
 * Extract (title, artist) pairs from wikitext.
 * Handles common patterns:
 *   | "[[Song Title]]" || [[Artist Name]]
 *   | "[[Song Title|Display]]" || [[Artist Name|Display]]
 *   | "Song Title" || Artist Name
 */
function extractSongs(wikitext) {
  const songs = [];

  // Pattern 1: Wiki table rows with [[ ]] links
  // Matches: | "[[Title]]" or "[[Title|Display]]" || [[Artist]] or [[Artist|Display]]
  const rowRegex = /\|\s*"?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]"?\s*\|\|\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match;
  while ((match = rowRegex.exec(wikitext)) !== null) {
    songs.push({ title: clean(match[1]), artist: clean(match[2]) });
  }

  if (songs.length >= 10) return songs;

  // Pattern 2: Rows with quoted title (no wiki link) and artist wiki link
  const rowRegex2 = /\|\s*"([^"]+)"\s*\|\|\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  while ((match = rowRegex2.exec(wikitext)) !== null) {
    const title = clean(match[1]);
    const artist = clean(match[2]);
    if (!songs.some((s) => s.title === title && s.artist === artist)) {
      songs.push({ title, artist });
    }
  }

  if (songs.length >= 10) return songs;

  // Pattern 3: Rows with wiki-linked title (may have quotes) and plain or linked artist
  // More permissive: | ... "[[Title]]" ... || ... Artist ...
  const rowRegex3 = /\|\s*(?:\d+\s*\|\|?)?\s*"?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]"?\s*\|\|?\s*([^\n|]+)/g;
  while ((match = rowRegex3.exec(wikitext)) !== null) {
    const title = clean(match[2] || match[1]);
    let artist = match[3].trim();
    // Strip wiki links from artist
    artist = artist.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, link, display) => display || link);
    artist = clean(artist);
    if (artist && title && !songs.some((s) => s.title === title && s.artist === artist)) {
      songs.push({ title, artist });
    }
  }

  return songs;
}

function clean(s) {
  return s
    .replace(/\[\[|\]\]/g, '')
    .replace(/\{\{.*?\}\}/g, '')
    .replace(/<!--.*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const allSongs = new Map(); // key: "title|||artist" → {title, artist, year}
  let fetched = 0;
  let failed = 0;

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const candidates = getTitleCandidates(year);
    let wikitext = null;

    for (const title of candidates) {
      wikitext = await fetchWikitext(title);
      if (wikitext) break;
      await sleep(500);
    }

    if (!wikitext) {
      console.log(`[${year}] SKIP — no page found`);
      failed++;
      await sleep(DELAY_MS);
      continue;
    }

    const songs = extractSongs(wikitext);
    let added = 0;

    for (const { title, artist } of songs) {
      const key = `${title.toLowerCase()}|||${artist.toLowerCase()}`;
      if (!allSongs.has(key)) {
        allSongs.set(key, { title, artist, year });
        added++;
      }
    }

    console.log(`[${year}] Found ${songs.length} songs, ${added} new (total unique: ${allSongs.size})`);
    fetched++;
    await sleep(DELAY_MS);
  }

  // Assign IDs starting at 10001
  let nextId = 10001;
  const output = Array.from(allSongs.values()).map((song) => ({
    id: nextId++,
    title: song.title,
    artist: song.artist,
    year: song.year,
  }));

  // Sort by year then title
  output.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));

  writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`\nDone! ${output.length} unique songs written to ${OUTPUT}`);
  console.log(`Years fetched: ${fetched}, failed: ${failed}`);
}

main().catch(console.error);
