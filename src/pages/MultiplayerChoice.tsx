import { useNavigate } from 'react-router-dom'

export default function MultiplayerChoice() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <h1 className="text-4xl font-bold mb-4">Multiplayer</h1>
      <p className="text-gray-400 mb-10 text-center">
        Host a game or join an existing one
      </p>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={() => navigate('/host')}
          className="w-full px-8 py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-2xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
        >
          Host a Game
        </button>
        <button
          onClick={() => navigate('/join')}
          className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-2xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
        >
          Join a Game
        </button>
      </div>
      <button
        onClick={() => navigate('/')}
        className="mt-8 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
      >
        Back
      </button>
    </div>
  )
}
