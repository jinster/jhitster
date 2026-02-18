import { useState, useEffect } from 'react'
import type { Song } from '../types'

const cache = new Map<number, string | null>()

export function useItunesPreview(song: Song | null): { previewUrl: string | null; loading: boolean } {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!song) {
      setPreviewUrl(null)
      setLoading(false)
      return
    }

    // Song already has a previewUrl
    if (song.previewUrl) {
      setPreviewUrl(song.previewUrl)
      setLoading(false)
      return
    }

    // Check cache
    if (cache.has(song.id)) {
      setPreviewUrl(cache.get(song.id)!)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setPreviewUrl(null)

    const term = encodeURIComponent(`${song.artist} ${song.title}`)
    fetch(`https://itunes.apple.com/search?term=${term}&limit=1&media=music`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const url: string | null = data.results?.[0]?.previewUrl ?? null
        cache.set(song.id, url)
        setPreviewUrl(url)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        cache.set(song.id, null)
        setPreviewUrl(null)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [song?.id, song?.previewUrl, song?.artist, song?.title])

  return { previewUrl, loading }
}
