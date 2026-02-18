import { useNavigate } from 'react-router-dom'

export default function VictoryPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-4">Victory!</h1>
      <p className="text-2xl text-gray-400 mb-12">Winner celebration will be here</p>
      <button
        onClick={() => navigate('/')}
        className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white text-2xl font-semibold rounded-xl transition-colors cursor-pointer"
      >
        Play Again
      </button>
    </div>
  )
}
