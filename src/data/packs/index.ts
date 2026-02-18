import type { Song, SongPack } from '../../types'

export interface PackEntry {
  meta: SongPack
  load: () => Promise<Song[]>
}

export const packs: PackEntry[] = [
  {
    meta: {
      id: 'billboard-hits',
      name: 'Billboard Year-End Hot 100',
      description: 'Thousands of Billboard Year-End #1-100 hits (1946-2024)',
      songCount: 6057,
      yearRange: [1959, 2024],
      hasAudio: false,
    },
    load: () => import('./billboard-hits.json').then((m) => m.default as Song[]),
  },
  {
    meta: {
      id: 'kpop-hits',
      name: 'K-Pop Hits',
      description: '500 K-pop hits spanning 1st gen to 5th gen (1986-2024)',
      songCount: 500,
      yearRange: [1986, 2024],
      hasAudio: false,
    },
    load: () => import('./kpop-hits.json').then((m) => m.default as Song[]),
  },
]
