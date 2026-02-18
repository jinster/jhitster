import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'

export default function PlayerSetup() {
  const navigate = useNavigate()
  const { state, setPlayers } = useGame()
  const [names, setNames] = useState(['', ''])

  useEffect(() => {
    if (state.songs.length === 0) {
      navigate('/packs')
    }
  }, [state.songs.length, navigate])

  const addPlayer = () => {
    if (names.length < 8) setNames([...names, ''])
  }

  const removePlayer = (index: number) => {
    if (names.length > 2) setNames(names.filter((_, i) => i !== index))
  }

  const updateName = (index: number, value: string) => {
    const updated = [...names]
    updated[index] = value
    setNames(updated)
  }

  const validNames = names.map((n) => n.trim()).filter(Boolean)
  const canSubmit = validNames.length >= 2

  const handleStart = () => {
    if (!canSubmit) return
    setPlayers(validNames)
    navigate('/deal')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <h1 className="text-4xl font-bold mb-8">Player Setup</h1>
      <div className="flex flex-col gap-4 w-full max-w-md">
        {names.map((name, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              placeholder={`Player ${i + 1}`}
              value={name}
              onChange={(e) => updateName(i, e.target.value)}
              className="flex-1 min-h-[48px] px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-purple-500"
            />
            {names.length > 2 && (
              <button
                onClick={() => removePlayer(i)}
                className="min-w-[48px] min-h-[48px] px-3 py-3 rounded-lg bg-gray-800 border border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-400 transition-colors cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {names.length < 8 && (
          <button
            onClick={addPlayer}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            + Add Player
          </button>
        )}
        <button
          onClick={handleStart}
          disabled={!canSubmit}
          className="mt-4 w-full px-8 py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
