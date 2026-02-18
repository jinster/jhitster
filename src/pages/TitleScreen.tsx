import { useNavigate } from 'react-router-dom'

export default function TitleScreen() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-6xl font-bold mb-8">JHitster</h1>
      <p className="text-xl text-gray-400 mb-12">Guess the year, build your timeline</p>
      <button
        onClick={() => navigate('/setup')}
        className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white text-2xl font-semibold rounded-xl transition-colors cursor-pointer"
      >
        Start Game
      </button>
    </div>
  )
}
