import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Timeline from '../components/Timeline'

type TurnPhase = 'placing' | 'revealed'

export default function GameScreen() {
  const navigate = useNavigate()
  const { state, placeCard, nextTurn, isPlacementCorrect } = useGame()
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('placing')
  const [placedPosition, setPlacedPosition] = useState<number | null>(null)
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)

  const currentPlayer = state.players[state.currentPlayerIndex]

  // Redirect if game isn't in playing state
  useEffect(() => {
    if (state.phase === 'victory') {
      navigate('/victory')
    } else if (state.phase === 'setup' || state.players.length === 0) {
      navigate('/setup')
    }
  }, [state.phase, state.players.length, navigate])

  if (!currentPlayer || !state.currentCard) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-gray-400">No cards remaining in the deck.</p>
      </div>
    )
  }

  const handleDropZoneClick = (position: number) => {
    if (turnPhase !== 'placing') return

    const sortedTimeline = [...currentPlayer.timeline].sort((a, b) => a.year - b.year)
    const correct = isPlacementCorrect(sortedTimeline, state.currentCard!, position)

    setPlacedPosition(position)
    setWasCorrect(correct)
    setTurnPhase('revealed')
    placeCard(position)
  }

  const handleNextTurn = () => {
    setTurnPhase('placing')
    setPlacedPosition(null)
    setWasCorrect(null)

    if (state.phase === 'victory') {
      navigate('/victory')
    } else {
      nextTurn()
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-gray-400 text-sm">
          Cards remaining: {state.deck.length}
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-purple-300 mt-1">
          {currentPlayer.name}'s Turn
        </h2>
      </div>

      {/* Current Card */}
      <motion.div
        key={state.currentCard.id}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-48 h-28 sm:w-56 sm:h-32 bg-gray-800 border-2 border-purple-500 rounded-xl flex flex-col items-center justify-center p-3 mb-6"
      >
        <p className="text-sm sm:text-base font-semibold text-center leading-tight">
          {state.currentCard.title}
        </p>
        <p className="text-xs sm:text-sm text-gray-400 mt-1 text-center">
          {state.currentCard.artist}
        </p>
        {turnPhase === 'revealed' && (
          <motion.p
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-lg font-bold mt-1 ${wasCorrect ? 'text-green-400' : 'text-red-400'}`}
          >
            {state.currentCard.year}
          </motion.p>
        )}
        {turnPhase === 'placing' && (
          <p className="text-lg font-bold mt-1 text-gray-600">????</p>
        )}
      </motion.div>

      {/* Result Banner */}
      {turnPhase === 'revealed' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-lg font-bold mb-4 px-4 py-2 rounded-lg ${
            wasCorrect
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {wasCorrect ? 'Correct! Card added to timeline.' : 'Wrong! Card discarded.'}
        </motion.div>
      )}

      {/* Instructions */}
      {turnPhase === 'placing' && (
        <p className="text-gray-400 text-sm mb-2">
          Tap a slot on the timeline to place this song
        </p>
      )}

      {/* Timeline */}
      <div className="w-full max-w-3xl">
        <h3 className="text-sm text-gray-500 mb-1">
          {currentPlayer.name}'s Timeline ({currentPlayer.timeline.length} cards)
        </h3>
        <Timeline
          cards={currentPlayer.timeline}
          faceUp
          showDropZones={turnPhase === 'placing'}
          onDropZoneClick={handleDropZoneClick}
          highlightPosition={placedPosition}
          highlightCorrect={wasCorrect}
        />
      </div>

      {/* Next Turn Button */}
      {turnPhase === 'revealed' && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleNextTurn}
          className="mt-6 px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white text-xl font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Next Turn
        </motion.button>
      )}
    </div>
  )
}
