import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const songsPath = join(__dirname, '..', 'src', 'data', 'songs.json');

const songs = JSON.parse(readFileSync(songsPath, 'utf-8'));

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPreview(title, artist) {
  const query = encodeURIComponent(`${artist} ${title}`);
  const url = `https://itunes.apple.com/search?term=${query}&limit=1&media=music`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.results?.[0]?.previewUrl ?? null;
}

let updated = 0;

for (const song of songs) {
  if (song.previewUrl) {
    console.log(`  SKIP: ${song.title} — ${song.artist} (already has preview)`);
    continue;
  }

  try {
    const previewUrl = await fetchPreview(song.title, song.artist);
    song.previewUrl = previewUrl;
    updated++;
    console.log(previewUrl ? `  OK: ${song.title}` : `  MISS: ${song.title} (no preview found)`);
  } catch (err) {
    console.error(`  ERR: ${song.title} — ${err.message}`);
    song.previewUrl = null;
  }

  await delay(3000);
}

writeFileSync(songsPath, JSON.stringify(songs, null, 2) + '\n');
console.log(`\nDone. Updated ${updated} songs.`);
