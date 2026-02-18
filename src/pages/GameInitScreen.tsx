import { useNavigate } from 'react-router-dom'

export default function GameInitScreen() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">Dealing Cards...</h1>
      <p className="text-gray-400 mb-12">Game initialization will happen here</p>
      <button
        onClick={() => navigate('/play')}
        className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white text-2xl font-semibold rounded-xl transition-colors cursor-pointer"
      >
        Begin!
      </button>
    </div>
  )
}
