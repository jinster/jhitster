import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Timeline from '../components/Timeline'

type TurnPhase = 'placing' | 'challenge' | 'revealed'

export default function GameScreen() {
  const navigate = useNavigate()
  const { state, placeCard, challengePenalty, nextTurn, isPlacementCorrect } = useGame()
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('placing')
  const [placedPosition, setPlacedPosition] = useState<number | null>(null)
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  const [challengeResult, setChallengeResult] = useState<string | null>(null)
  // Store the current card info before dispatch clears it
  const pendingCard = useRef(state.currentCard)

  const currentPlayer = state.players[state.currentPlayerIndex]

  // Redirect if game isn't in playing state
  useEffect(() => {
    if (state.phase === 'victory') {
      navigate('/victory')
    } else if (state.phase === 'setup' || state.players.length === 0) {
      navigate('/setup')
    }
  }, [state.phase, state.players.length, navigate])

  // Keep pendingCard in sync when a new card is drawn
  useEffect(() => {
    if (state.currentCard && turnPhase === 'placing') {
      pendingCard.current = state.currentCard
    }
  }, [state.currentCard, turnPhase])

  if (!currentPlayer || (!state.currentCard && turnPhase === 'placing')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-gray-400">No cards remaining in the deck.</p>
      </div>
    )
  }

  // Use pendingCard during challenge/revealed phases (since placeCard clears currentCard)
  const displayCard = turnPhase === 'placing' ? state.currentCard! : pendingCard.current!

  const handleDropZoneClick = (position: number) => {
    if (turnPhase !== 'placing') return

    const sortedTimeline = [...currentPlayer.timeline].sort((a, b) => a.year - b.year)
    const correct = isPlacementCorrect(sortedTimeline, state.currentCard!, position)

    pendingCard.current = state.currentCard
    setPlacedPosition(position)
    setWasCorrect(correct)

    // If more than 1 player, show challenge phase
    if (state.players.length > 1) {
      setTurnPhase('challenge')
    } else {
      // Solo mode: skip challenge
      placeCard(position)
      setTurnPhase('revealed')
    }
  }

  const handleNoChallenge = () => {
    placeCard(placedPosition!)
    setTurnPhase('revealed')
  }

  const handleChallenge = (challengerIndex: number) => {
    const challengerName = state.players[challengerIndex].name

    if (wasCorrect) {
      // Challenger was wrong — placement was actually correct
      // Place the card, then penalize challenger
      placeCard(placedPosition!)
      challengePenalty(challengerIndex)
      setChallengeResult(`${challengerName} challenged and was WRONG! They draw a penalty card.`)
    } else {
      // Challenger was right — placement was wrong
      // Place the card (which handles the incorrect placement + penalty for current player)
      placeCard(placedPosition!)
      setChallengeResult(`${challengerName} challenged and was RIGHT! ${currentPlayer.name} gets a penalty.`)
    }

    setTurnPhase('revealed')
  }

  const handleNextTurn = () => {
    setTurnPhase('placing')
    setPlacedPosition(null)
    setWasCorrect(null)
    setChallengeResult(null)

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
        key={displayCard.id}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-48 h-28 sm:w-56 sm:h-32 bg-gray-800 border-2 border-purple-500 rounded-xl flex flex-col items-center justify-center p-3 mb-6"
      >
        <p className="text-sm sm:text-base font-semibold text-center leading-tight">
          {displayCard.title}
        </p>
        <p className="text-xs sm:text-sm text-gray-400 mt-1 text-center">
          {displayCard.artist}
        </p>
        {turnPhase === 'revealed' && (
          <motion.p
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-lg font-bold mt-1 ${wasCorrect ? 'text-green-400' : 'text-red-400'}`}
          >
            {displayCard.year}
          </motion.p>
        )}
        {(turnPhase === 'placing' || turnPhase === 'challenge') && (
          <p className="text-lg font-bold mt-1 text-gray-600">????</p>
        )}
      </motion.div>

      {/* Challenge Phase */}
      {turnPhase === 'challenge' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-center"
        >
          <p className="text-yellow-400 font-semibold text-lg mb-3">
            {currentPlayer.name} placed the card. Anyone want to challenge?
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {state.players.map((player, i) => {
              if (i === state.currentPlayerIndex) return null
              return (
                <button
                  key={i}
                  onClick={() => handleChallenge(i)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {player.name} Challenges!
                </button>
              )
            })}
          </div>
          <button
            onClick={handleNoChallenge}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
          >
            No Challenge — Reveal
          </button>
        </motion.div>
      )}

      {/* Result Banner */}
      {turnPhase === 'revealed' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-center"
        >
          <div
            className={`text-lg font-bold px-4 py-2 rounded-lg ${
              wasCorrect
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {wasCorrect ? 'Correct! Card added to timeline.' : 'Wrong! Card discarded.'}
          </div>
          {challengeResult && (
            <p className="text-yellow-300 text-sm mt-2">{challengeResult}</p>
          )}
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
          highlightPosition={turnPhase === 'revealed' ? placedPosition : null}
          highlightCorrect={turnPhase === 'revealed' ? wasCorrect : null}
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
