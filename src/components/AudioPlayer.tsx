import { useRef, useState, useEffect, useCallback } from 'react'

interface AudioPlayerProps {
  src: string
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const cleanup = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
    }
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.src = src
    audio.load()
    setPlaying(false)
    setProgress(0)
    setDuration(0)

    // Autoplay
    audio.play().then(() => setPlaying(true)).catch(() => {})
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setProgress(audio.currentTime)
    const onLoaded = () => setDuration(audio.duration)
    const onEnded = () => setPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    audio.currentTime = ratio * duration
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <audio ref={audioRef} preload="auto" />

      <button
        onClick={togglePlay}
        className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <polygon points="6,4 20,12 6,20" />
          </svg>
        )}
      </button>

      <div
        className="w-full h-2 bg-gray-700 rounded-full cursor-pointer overflow-hidden"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-purple-500 rounded-full transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
