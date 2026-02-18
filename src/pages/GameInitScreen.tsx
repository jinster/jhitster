import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'

export default function GameInitScreen() {
  const navigate = useNavigate()
  const { state, dealInitialCards } = useGame()
  const [dealt, setDealt] = useState(false)
  const [showCards, setShowCards] = useState<number[]>([])

  useEffect(() => {
    // Redirect if no players set up
    if (state.players.length === 0) {
      navigate('/setup')
      return
    }

    if (!dealt) {
      dealInitialCards(0)
      setDealt(true)
    }
  }, [state.players.length, dealt, dealInitialCards, navigate])

  // Stagger card reveal animation
  useEffect(() => {
    if (!dealt) return
    const timers: ReturnType<typeof setTimeout>[] = []
    state.players.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setShowCards((prev) => [...prev, i])
      }, 400 * (i + 1)))
    })
    return () => timers.forEach(clearTimeout)
  }, [dealt, state.players])

  const allRevealed = showCards.length >= state.players.length

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Dealing Cards...</h1>

      <div className="flex flex-wrap justify-center gap-6 mb-12">
        <AnimatePresence>
          {state.players.map((player, i) => (
            showCards.includes(i) && (
              <motion.div
                key={player.name}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-2"
              >
                <p className="text-lg font-semibold text-purple-300">{player.name}</p>
                {player.timeline[0] && (
                  <div className="w-36 h-24 bg-gray-800 border border-purple-500 rounded-lg flex flex-col items-center justify-center p-2">
                    <p className="text-sm font-medium text-center leading-tight">{player.timeline[0].title}</p>
                    <p className="text-xs text-gray-400 mt-1">{player.timeline[0].artist}</p>
                    <p className="text-xs text-purple-400 mt-1">{player.timeline[0].year}</p>
                  </div>
                )}
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>

      {allRevealed && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => navigate('/play')}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white text-2xl font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Start Playing!
        </motion.button>
      )}
    </div>
  )
}
