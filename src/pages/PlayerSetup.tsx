import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PlayerSetup() {
  const navigate = useNavigate()
  const [names, setNames] = useState(['', ''])

  const addPlayer = () => setNames([...names, ''])

  const updateName = (index: number, value: string) => {
    const updated = [...names]
    updated[index] = value
    setNames(updated)
  }

  const canSubmit = names.filter((n) => n.trim()).length >= 2

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Player Setup</h1>
      <div className="flex flex-col gap-4 w-full max-w-md">
        {names.map((name, i) => (
          <input
            key={i}
            type="text"
            placeholder={`Player ${i + 1}`}
            value={name}
            onChange={(e) => updateName(i, e.target.value)}
            className="px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-purple-500"
          />
        ))}
        <button
          onClick={addPlayer}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          + Add Player
        </button>
        <button
          onClick={() => canSubmit && navigate('/deal')}
          disabled={!canSubmit}
          className="mt-4 px-8 py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
