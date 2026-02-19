import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Timeline from '../components/Timeline'
import AudioPlayer from '../components/AudioPlayer'
import { useItunesPreview } from '../hooks/useItunesPreview'

type TurnPhase = 'placing' | 'tokenWindow' | 'revealed'

export default function GameScreen() {
  const navigate = useNavigate()
  const { state, resolveTurn, skipSong, nextTurn, drawCard, isPlacementCorrect } = useGame()
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('placing')
  const [pendingPosition, setPendingPosition] = useState<number | null>(null)
  const [placedPosition, setPlacedPosition] = useState<number | null>(null)
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  // Store the current card info before dispatch clears it
  const pendingCard = useRef(state.currentCard)

  // Token window state
  const [confirmedPosition, setConfirmedPosition] = useState<number | null>(null)
  const [tokenPlacements, setTokenPlacements] = useState<Map<number, number>>(new Map()) // playerIndex → position
  const [tokenTimeRemaining, setTokenTimeRemaining] = useState(5)
  const [selectedTokenPlayer, setSelectedTokenPlayer] = useState<number | null>(null)
  const [stealResult, setStealResult] = useState<{ playerIndex: number; playerName: string } | null>(null)

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

  // Token window countdown
  const resolveTokenWindow = useCallback(() => {
    if (confirmedPosition === null) return

    const sortedTimeline = [...currentPlayer.timeline].sort((a, b) => a.year - b.year)
    const correct = isPlacementCorrect(sortedTimeline, pendingCard.current!, confirmedPosition)

    // Convert tokenPlacements map to array
    const placements = Array.from(tokenPlacements.entries()).map(([playerIndex, position]) => ({
      playerIndex,
      position,
    }))

    // Determine steal result before dispatching
    const card = pendingCard.current!
    const correctPositions: number[] = []
    for (let i = 0; i <= sortedTimeline.length; i++) {
      if (isPlacementCorrect(sortedTimeline, card, i)) {
        correctPositions.push(i)
      }
    }

    let steal: { playerIndex: number; playerName: string } | null = null
    for (const tp of placements) {
      if (correctPositions.includes(tp.position)) {
        steal = { playerIndex: tp.playerIndex, playerName: state.players[tp.playerIndex].name }
        break
      }
    }

    setWasCorrect(correct)
    setPlacedPosition(confirmedPosition)
    setStealResult(steal)

    resolveTurn(confirmedPosition, placements)
    setTurnPhase('revealed')
  }, [confirmedPosition, currentPlayer, tokenPlacements, state.players, resolveTurn, isPlacementCorrect])

  useEffect(() => {
    if (turnPhase !== 'tokenWindow') return

    if (tokenTimeRemaining <= 0) {
      resolveTokenWindow()
      return
    }

    const timer = setInterval(() => {
      setTokenTimeRemaining((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [turnPhase, tokenTimeRemaining, resolveTokenWindow])

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

  // Use pendingCard during tokenWindow/revealed phases (since dispatch clears currentCard)
  const displayCard = turnPhase === 'placing' ? state.currentCard! : pendingCard.current!

  // On-demand iTunes preview lookup
  const itunesLookupSong = turnPhase === 'placing' ? displayCard : null
  const { previewUrl: itunesPreviewUrl, loading: itunesLoading } = useItunesPreview(itunesLookupSong)
  const effectivePreviewUrl = displayCard.previewUrl || itunesPreviewUrl

  const handleDropZoneClick = (position: number) => {
    if (turnPhase === 'placing') {
      setPendingPosition(position)
    } else if (turnPhase === 'tokenWindow' && selectedTokenPlayer !== null) {
      // Place token for the selected player
      setTokenPlacements((prev) => {
        const next = new Map(prev)
        next.set(selectedTokenPlayer, position)
        return next
      })
      setSelectedTokenPlayer(null)
    }
  }

  // Check if any non-active player has tokens
  const hasTokenPlayers = state.players.some(
    (p, i) => i !== state.currentPlayerIndex && p.tokens > 0
  )

  const confirmPlacement = () => {
    if (pendingPosition === null) return

    pendingCard.current = state.currentCard
    setConfirmedPosition(pendingPosition)
    setPendingPosition(null)

    if (hasTokenPlayers) {
      // Enter token window
      setTokenPlacements(new Map())
      setTokenTimeRemaining(5)
      setSelectedTokenPlayer(null)
      setTurnPhase('tokenWindow')
    } else {
      // No token players — resolve immediately with no token placements
      const sortedTimeline = [...currentPlayer.timeline].sort((a, b) => a.year - b.year)
      const correct = isPlacementCorrect(sortedTimeline, state.currentCard!, pendingPosition)

      setWasCorrect(correct)
      setPlacedPosition(pendingPosition)
      setStealResult(null)

      resolveTurn(pendingPosition, [])
      setTurnPhase('revealed')
    }
  }

  const cancelPendingPlacement = () => {
    setPendingPosition(null)
  }

  const handleSkipSong = () => {
    skipSong()
  }

  const handleNextTurn = () => {
    setTurnPhase('placing')
    setPendingPosition(null)
    setPlacedPosition(null)
    setWasCorrect(null)
    setConfirmedPosition(null)
    setTokenPlacements(new Map())
    setTokenTimeRemaining(5)
    setSelectedTokenPlayer(null)
    setStealResult(null)

    if (state.phase === 'victory') {
      navigate('/victory')
    } else {
      nextTurn()
    }
  }

  const handleSkipNoPreview = () => {
    drawCard()
  }

  // Token positions map for timeline display (position → player name)
  const tokenPositionsMap = new Map<number, string>()
  if (turnPhase === 'tokenWindow') {
    tokenPlacements.forEach((position, playerIndex) => {
      tokenPositionsMap.set(position, state.players[playerIndex].name)
    })
  }

  // Non-active players with tokens > 0 for token window
  const tokenEligiblePlayers = state.players
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.index !== state.currentPlayerIndex && p.tokens > 0)

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="text-center mb-4 w-full max-w-lg">
        <h2 className="text-2xl sm:text-3xl font-bold text-purple-300">
          {currentPlayer.name}'s Turn
        </h2>
        {/* Token display for all players */}
        <div className="flex justify-center gap-3 mt-2 flex-wrap">
          {state.players.map((player, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-1 rounded-full ${
                i === state.currentPlayerIndex
                  ? 'bg-purple-600/30 text-purple-300'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {player.name}: {player.tokens} token{player.tokens !== 1 ? 's' : ''}
            </span>
          ))}
        </div>
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
        ) : turnPhase === 'tokenWindow' ? (
          /* Token window: show card title but no year */
          <motion.div
            key="token-window"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-gray-800 border-2 border-yellow-500 rounded-xl flex flex-col items-center justify-center p-4"
          >
            <p className="text-sm text-yellow-400 mb-2 font-semibold">Steal Window!</p>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(tokenTimeRemaining / 5) * 100}%` }}
              />
            </div>
            <p className="text-2xl font-bold text-yellow-400">{tokenTimeRemaining}s</p>
          </motion.div>
        ) : (
          /* Placing: show audio player, no metadata */
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
          {stealResult && (
            <div className="mt-2 text-lg font-bold px-4 py-3 rounded-lg bg-yellow-500/20 text-yellow-400">
              {stealResult.playerName} stole the card!
            </div>
          )}
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

      {/* Token Window: player selector chips */}
      {turnPhase === 'tokenWindow' && (
        <div className="mb-3 w-full max-w-lg">
          <p className="text-gray-400 text-sm mb-2 text-center">
            Tap a player name, then tap a position to use their token
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {tokenEligiblePlayers.map((p) => {
              const hasPlaced = tokenPlacements.has(p.index)
              const isSelected = selectedTokenPlayer === p.index
              return (
                <button
                  key={p.index}
                  onClick={() => !hasPlaced && setSelectedTokenPlayer(isSelected ? null : p.index)}
                  disabled={hasPlaced}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors touch-manipulation ${
                    hasPlaced
                      ? 'bg-yellow-600/30 text-yellow-400 cursor-not-allowed'
                      : isSelected
                      ? 'bg-yellow-500 text-gray-900 cursor-pointer'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'
                  }`}
                >
                  {p.name} {hasPlaced ? '(placed)' : `(${p.tokens})`}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Skip Song button (during placing phase) */}
      {turnPhase === 'placing' && currentPlayer.tokens > 0 && pendingPosition === null && (
        <button
          onClick={handleSkipSong}
          className="mb-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-yellow-400 text-sm font-semibold rounded-lg transition-colors cursor-pointer touch-manipulation"
        >
          Skip Song (1 token)
        </button>
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
          showDropZones={turnPhase === 'placing' || turnPhase === 'tokenWindow'}
          onDropZoneClick={handleDropZoneClick}
          highlightPosition={turnPhase === 'revealed' ? placedPosition : null}
          highlightCorrect={turnPhase === 'revealed' ? wasCorrect : null}
          pendingPosition={turnPhase === 'placing' ? pendingPosition : null}
          tokenPositions={turnPhase === 'tokenWindow' ? tokenPositionsMap : undefined}
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
