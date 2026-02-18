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
