import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Timeline from '../components/Timeline'
import AudioPlayer from '../components/AudioPlayer'
import { useItunesPreview } from '../hooks/useItunesPreview'

type TurnPhase = 'placing' | 'revealed'

export default function GameScreen() {
  const navigate = useNavigate()
  const { state, placeCard, nextTurn, drawCard, isPlacementCorrect } = useGame()
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('placing')
  const [pendingPosition, setPendingPosition] = useState<number | null>(null)
  const [placedPosition, setPlacedPosition] = useState<number | null>(null)
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
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

  // Warn before losing game state on refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Keep pendingCard in sync when a new card is drawn
  useEffect(() => {
    if (state.currentCard && turnPhase === 'placing') {
      pendingCard.current = state.currentCard
    }
  }, [state.currentCard, turnPhase])

  if (!currentPlayer || (!state.currentCard && turnPhase === 'placing')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white gap-4 p-4">
        <p className="text-gray-400 text-lg">No cards remaining in the deck!</p>
        <p className="text-gray-500 text-center">The game is a draw — no one reached {state.targetTimelineLength} cards.</p>
        <button
          onClick={() => { navigate('/') }}
          className="mt-4 w-full max-w-lg px-8 py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
        >
          Back to Home
        </button>
      </div>
    )
  }

  // Use pendingCard during challenge/revealed phases (since placeCard clears currentCard)
  const displayCard = turnPhase === 'placing' ? state.currentCard! : pendingCard.current!

  // On-demand iTunes preview lookup
  const itunesLookupSong = turnPhase !== 'revealed' ? displayCard : null
  const { previewUrl: itunesPreviewUrl, loading: itunesLoading } = useItunesPreview(itunesLookupSong)
  const effectivePreviewUrl = displayCard.previewUrl || itunesPreviewUrl

  const handleDropZoneClick = (position: number) => {
    if (turnPhase !== 'placing') return
    setPendingPosition(position)
  }

  const confirmPlacement = () => {
    if (pendingPosition === null) return

    const sortedTimeline = [...currentPlayer.timeline].sort((a, b) => a.year - b.year)
    const correct = isPlacementCorrect(sortedTimeline, state.currentCard!, pendingPosition)

    pendingCard.current = state.currentCard
    setPlacedPosition(pendingPosition)
    setWasCorrect(correct)
    setPendingPosition(null)

    placeCard(pendingPosition)
    setTurnPhase('revealed')
  }

  const cancelPendingPlacement = () => {
    setPendingPosition(null)
  }

  const handleNextTurn = () => {
    setTurnPhase('placing')
    setPendingPosition(null)
    setPlacedPosition(null)
    setWasCorrect(null)

    if (state.phase === 'victory') {
      navigate('/victory')
    } else {
      nextTurn()
    }
  }

  const handleSkipNoPreview = () => {
    drawCard()
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="text-center mb-4 w-full max-w-lg">
        <h2 className="text-2xl sm:text-3xl font-bold text-purple-300">
          {currentPlayer.name}'s Turn
        </h2>
      </div>

      {/* Current Card Area */}
      <div className="w-full max-w-lg mb-6">
        {turnPhase === 'revealed' ? (
          /* Revealed: show full card info */
          <motion.div
            key={displayCard.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-gray-800 border-2 border-purple-500 rounded-xl flex flex-col items-center justify-center p-4"
          >
            <p className="text-base sm:text-lg font-semibold text-center leading-tight">
              {displayCard.title}
            </p>
            <p className="text-sm text-gray-400 mt-1 text-center">
              {displayCard.artist}
            </p>
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-2xl font-bold mt-2 ${wasCorrect ? 'text-green-400' : 'text-red-400'}`}
            >
              {displayCard.year}
            </motion.p>
          </motion.div>
        ) : (
          /* Placing / Challenge: show audio player, no metadata */
          <motion.div
            key={displayCard.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-gray-800 border-2 border-purple-500 rounded-xl flex flex-col items-center justify-center p-4"
          >
            <p className="text-sm text-gray-500 mb-3">Listen and guess the year</p>
            {itunesLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Loading preview...</p>
              </div>
            ) : effectivePreviewUrl ? (
              <AudioPlayer src={effectivePreviewUrl} />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-gray-400">No preview available</p>
                <button
                  onClick={handleSkipNoPreview}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white font-semibold rounded-lg transition-colors cursor-pointer touch-manipulation"
                >
                  Skip — Draw New Card
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Result Banner */}
      {turnPhase === 'revealed' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-center w-full max-w-lg"
        >
          <div
            className={`text-lg font-bold px-4 py-3 rounded-lg ${
              wasCorrect
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {wasCorrect ? 'Correct! Card added to timeline.' : 'Wrong! Card discarded.'}
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      {turnPhase === 'placing' && (
        <p className="text-gray-400 text-sm mb-2">
          {pendingPosition !== null
            ? 'Confirm placement or tap another slot'
            : 'Tap a slot on the timeline to place this song'}
        </p>
      )}

      {/* Confirm / Cancel buttons */}
      {turnPhase === 'placing' && pendingPosition !== null && (
        <div className="flex gap-3 mb-3 w-full max-w-lg">
          <button
            onClick={confirmPlacement}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-semibold rounded-lg transition-colors cursor-pointer touch-manipulation"
          >
            Confirm
          </button>
          <button
            onClick={cancelPendingPlacement}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white font-semibold rounded-lg transition-colors cursor-pointer touch-manipulation"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="w-full max-w-lg">
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
          pendingPosition={turnPhase === 'placing' ? pendingPosition : null}
        />
      </div>

      {/* Next Turn Button */}
      {turnPhase === 'revealed' && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleNextTurn}
          className="mt-6 w-full max-w-lg px-8 py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
        >
          Next Turn
        </motion.button>
      )}
    </div>
  )
}
