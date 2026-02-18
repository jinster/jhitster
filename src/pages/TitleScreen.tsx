import { useNavigate } from 'react-router-dom'

export default function TitleScreen() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <h1 className="text-5xl sm:text-6xl font-bold mb-6 sm:mb-8">JHitster</h1>
      <p className="text-lg sm:text-xl text-gray-400 mb-10 sm:mb-12 text-center">Guess the year, build your timeline</p>
      <button
        onClick={() => navigate('/setup')}
        className="w-full max-w-sm px-8 py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-2xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
      >
        Start Game
      </button>
    </div>
  )
}
