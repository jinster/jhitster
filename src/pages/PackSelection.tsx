import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { packs } from '../data/packs'
import type { Song } from '../types'

export default function PackSelection() {
  const navigate = useNavigate()
  const { setPacks } = useGame()
  const [selected, setSelected] = useState<Set<string>>(new Set([packs[0].meta.id]))
  const [loading, setLoading] = useState(false)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size > 1) next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleContinue = async () => {
    setLoading(true)
    try {
      const selectedPacks = packs.filter((p) => selected.has(p.meta.id))
      const loaded = await Promise.all(selectedPacks.map((p) => p.load()))
      const allSongs: Song[] = loaded.flat()
      setPacks([...selected], allSongs)
      navigate('/setup')
    } catch {
      setLoading(false)
    }
  }

  const totalSongs = packs
    .filter((p) => selected.has(p.meta.id))
    .reduce((sum, p) => sum + p.meta.songCount, 0)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <h1 className="text-4xl font-bold mb-2">Song Packs</h1>
      <p className="text-gray-400 mb-8">Select one or more packs to play with</p>

      <div className="flex flex-col gap-3 w-full max-w-md mb-8">
        {packs.map((pack) => {
          const isSelected = selected.has(pack.meta.id)
          return (
            <button
              key={pack.meta.id}
              onClick={() => toggle(pack.meta.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-colors cursor-pointer touch-manipulation ${
                isSelected
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-semibold">{pack.meta.name}</h3>
                <span className={`text-sm px-2 py-0.5 rounded ${isSelected ? 'bg-purple-600' : 'bg-gray-700'}`}>
                  {isSelected ? 'Selected' : 'Tap to add'}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-2">{pack.meta.description}</p>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>{pack.meta.songCount} songs</span>
                <span>{pack.meta.yearRange[0]}–{pack.meta.yearRange[1]}</span>
                {pack.meta.hasAudio && <span>Audio included</span>}
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-gray-500 text-sm mb-4">
        {totalSongs} songs selected across {selected.size} pack{selected.size !== 1 ? 's' : ''}
      </p>

      <button
        onClick={handleContinue}
        disabled={loading}
        className="w-full max-w-md px-8 py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
      >
        {loading ? 'Loading...' : 'Continue'}
      </button>
    </div>
  )
}
