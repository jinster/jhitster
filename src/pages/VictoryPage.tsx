import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useGame } from '../context/GameContext'
import Timeline from '../components/Timeline'

export default function VictoryPage() {
  const navigate = useNavigate()
  const { state, resetGame } = useGame()

  // Fire confetti on mount
  useEffect(() => {
    const duration = 3000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])

  // Find the winning player
  const winner = state.players.find((p) => p.name === state.winner)

  const handlePlayAgain = () => {
    resetGame()
    navigate('/')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-8">
      <motion.h1
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="text-5xl sm:text-6xl font-bold mb-4 text-yellow-400"
      >
        Victory!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl sm:text-3xl text-purple-300 mb-8"
      >
        {state.winner ?? 'Someone'} wins!
      </motion.p>

      {/* Winner's completed timeline */}
      {winner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-4xl mb-8"
        >
          <h3 className="text-sm text-gray-500 mb-1 text-center">
            {winner.name}'s Timeline ({winner.timeline.length} cards)
          </h3>
          <Timeline cards={winner.timeline} faceUp />
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={handlePlayAgain}
        className="px-8 py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-2xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
      >
        Play Again
      </motion.button>
    </div>
  )
}
