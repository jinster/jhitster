import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useMultiplayer } from '../context/MultiplayerContext'
import Timeline from '../components/Timeline'
import AudioPlayer from '../components/AudioPlayer'
import { useItunesPreview } from '../hooks/useItunesPreview'
import type { GuestMessage } from '../types'

type TurnPhase = 'placing' | 'tokenWindow' | 'revealed' | 'waitingForGuest'

export default function GameScreen() {
  const navigate = useNavigate()
  const { state, resolveTurn, skipSong, nextTurn, drawCard, isPlacementCorrect } = useGame()
  const { role, broadcast, onGuestMessage, connPlayerMap } = useMultiplayer()

  const isMultiplayer = state.gameMode === 'multiplayer'
  const isHost = role === 'host'
  const isGuestTurn = isMultiplayer && isHost && state.currentPlayerIndex !== 0
  const stealTimeSec = isMultiplayer ? 5 : 10

  const [turnPhase, setTurnPhase] = useState<TurnPhase>('placing')
  const [pendingPosition, setPendingPosition] = useState<number | null>(null)
  const [placedPosition, setPlacedPosition] = useState<number | null>(null)
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  const pendingCard = useRef(state.currentCard)

  // Token window state
  const [confirmedPosition, setConfirmedPosition] = useState<number | null>(null)
  const [tokenPlacements, setTokenPlacements] = useState<Map<number, number>>(new Map())
  const [tokenTimeRemaining, setTokenTimeRemaining] = useState(0)
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
    if (state.currentCard && (turnPhase === 'placing' || turnPhase === 'waitingForGuest')) {
      pendingCard.current = state.currentCard
    }
  }, [state.currentCard, turnPhase])

  // Broadcast GAME_STATE + YOUR_TURN whenever the active player changes
  const prevPlayerIndexRef = useRef(state.currentPlayerIndex)
  useEffect(() => {
    if (!isHost || !currentPlayer) return

    // Broadcast GAME_STATE on every player index change
    if (prevPlayerIndexRef.current !== state.currentPlayerIndex || (turnPhase === 'placing' && isGuestTurn)) {
      prevPlayerIndexRef.current = state.currentPlayerIndex

      broadcast({
        type: 'GAME_STATE',
        players: state.players,
        currentPlayerIndex: state.currentPlayerIndex,
        phase: state.phase,
        targetTimelineLength: state.targetTimelineLength,
        deckSize: state.deck.length,
      })

      // If it's a guest's turn, send YOUR_TURN and switch to waiting
      if (isGuestTurn && turnPhase === 'placing') {
        setTurnPhase('waitingForGuest')
        broadcast({
          type: 'YOUR_TURN',
          timeline: currentPlayer.timeline,
          currentCard: state.currentCard,
          tokens: currentPlayer.tokens,
        })
      }
    }
  }, [isHost, isGuestTurn, turnPhase, state.currentPlayerIndex, state.players, state.phase, state.currentCard, state.targetTimelineLength, state.deck.length, broadcast, currentPlayer])

  // Broadcast TURN_RESULT when a turn is revealed
  useEffect(() => {
    if (isHost && turnPhase === 'revealed' && pendingCard.current) {
      broadcast({
        type: 'TURN_RESULT',
        wasCorrect: wasCorrect!,
        card: pendingCard.current,
        stealResult: stealResult,
      })
    }
  }, [isHost, turnPhase, wasCorrect, stealResult, broadcast])

  // Handle guest messages (multiplayer host only)
  const handleGuestMessage = useCallback((connId: string, message: GuestMessage) => {
    if (message.type === 'CONFIRM_PLACEMENT') {
      // Process guest's placement same as local
      pendingCard.current = state.currentCard
      const position = message.position

      const hasTokenPlayers = state.players.some(
        (p, i) => i !== state.currentPlayerIndex && p.tokens > 0
      )

      if (hasTokenPlayers) {
        setConfirmedPosition(position)
        setTokenPlacements(new Map())
        setTokenTimeRemaining(stealTimeSec)
        setSelectedTokenPlayer(null)
        setPendingPosition(null)
        setTurnPhase('tokenWindow')

        // Broadcast token window to guests
        broadcast({
          type: 'TOKEN_WINDOW',
          timeline: currentPlayer.timeline,
          card: state.currentCard!,
          timeRemaining: 5,
          takenPositions: [position],
        })
      } else {
        const sortedTimeline = [...currentPlayer.timeline].sort((a, b) => a.year - b.year)
        const correct = isPlacementCorrect(sortedTimeline, state.currentCard!, position)

        setWasCorrect(correct)
        setPlacedPosition(position)
        setConfirmedPosition(position)
        setStealResult(null)

        resolveTurn(position, [])
        setTurnPhase('revealed')
      }
    } else if (message.type === 'SKIP_SONG') {
      skipSong()
      // Re-send YOUR_TURN with new card (will be sent on next render via the isGuestTurn effect)
      setTurnPhase('placing')
    } else if (message.type === 'USE_TOKEN') {
      // Guest using a token during token window
      const guestPlayerIndex = connPlayerMap.current.get(connId)
      if (guestPlayerIndex === undefined) return
      setTokenPlacements((prev) => {
        const next = new Map(prev)
        next.set(guestPlayerIndex, message.position)
        return next
      })
    } else if (message.type === 'PENDING_POSITION') {
      // Guest selecting a position — broadcast to all other guests
      broadcast({ type: 'PENDING_PLACEMENT', position: message.position, timeline: currentPlayer.timeline })
    }
  }, [state, currentPlayer, broadcast, isPlacementCorrect, resolveTurn, skipSong, connPlayerMap])

  useEffect(() => {
    if (isHost) {
      onGuestMessage.current = handleGuestMessage
    }
  }, [isHost, handleGuestMessage, onGuestMessage])

  // Token window countdown
  const resolveTokenWindow = useCallback(() => {
    if (confirmedPosition === null) return

    const sortedTimeline = [...currentPlayer.timeline].sort((a, b) => a.year - b.year)
    const correct = isPlacementCorrect(sortedTimeline, pendingCard.current!, confirmedPosition)

    const placements = Array.from(tokenPlacements.entries()).map(([playerIndex, position]) => ({
      playerIndex,
      position,
    }))

    const card = pendingCard.current!
    const correctPositions: number[] = []
    for (let i = 0; i <= sortedTimeline.length; i++) {
      if (isPlacementCorrect(sortedTimeline, card, i)) {
        correctPositions.push(i)
      }
    }

    // Exclude the active player's confirmed position from valid steal positions
    const stealablePositions = correctPositions.filter(p => p !== confirmedPosition)

    let steal: { playerIndex: number; playerName: string } | null = null
    for (const tp of placements) {
      if (stealablePositions.includes(tp.position)) {
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

  // Compute displayCard safely for hook calls (must be before early return)
  const isPlacingOrWaiting = turnPhase === 'placing' || turnPhase === 'waitingForGuest'
  const displayCard = isPlacingOrWaiting ? state.currentCard : pendingCard.current

  // On-demand iTunes preview lookup — always look up audio on host (even for guest turns)
  const itunesLookupSong = isPlacingOrWaiting ? displayCard : null
  const { previewUrl: itunesPreviewUrl, loading: itunesLoading } = useItunesPreview(itunesLookupSong)
  const effectivePreviewUrl = displayCard?.previewUrl || itunesPreviewUrl

  // Broadcast AUDIO_SYNC when preview URL resolves
  const prevPreviewUrlRef = useRef<string | null | undefined>(null)
  useEffect(() => {
    if (!isHost || !isMultiplayer) return
    if (effectivePreviewUrl !== prevPreviewUrlRef.current) {
      prevPreviewUrlRef.current = effectivePreviewUrl
      if (effectivePreviewUrl && isPlacingOrWaiting) {
        broadcast({ type: 'AUDIO_SYNC', previewUrl: effectivePreviewUrl, playing: true })
      }
    }
  }, [isHost, isMultiplayer, effectivePreviewUrl, isPlacingOrWaiting, broadcast])

  // Stop guest audio when entering revealed or tokenWindow
  useEffect(() => {
    if (!isHost || !isMultiplayer) return
    if (turnPhase === 'revealed' || turnPhase === 'tokenWindow') {
      broadcast({ type: 'AUDIO_SYNC', previewUrl: null, playing: false })
    }
  }, [isHost, isMultiplayer, turnPhase, broadcast])

  // Broadcast PENDING_PLACEMENT when host's own pendingPosition changes (multiplayer)
  useEffect(() => {
    if (!isHost || !isMultiplayer || isGuestTurn || !currentPlayer) return
    broadcast({ type: 'PENDING_PLACEMENT', position: pendingPosition, timeline: currentPlayer.timeline })
  }, [isHost, isMultiplayer, isGuestTurn, pendingPosition, currentPlayer?.timeline, broadcast])

  const handleAudioPlayStateChange = useCallback((playing: boolean) => {
    if (!isHost || !isMultiplayer) return
    broadcast({ type: 'AUDIO_SYNC', previewUrl: effectivePreviewUrl ?? null, playing })
  }, [isHost, isMultiplayer, effectivePreviewUrl, broadcast])

  if (!currentPlayer || (!state.currentCard && isPlacingOrWaiting)) {
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

  // After early return, displayCard is guaranteed non-null
  const safeDisplayCard = displayCard!

  const handleDropZoneClick = (position: number) => {
    if (turnPhase === 'placing' && !isGuestTurn) {
      setPendingPosition(position)
    } else if (turnPhase === 'tokenWindow' && selectedTokenPlayer !== null) {
      setTokenPlacements((prev) => {
        const next = new Map(prev)
        next.set(selectedTokenPlayer, position)
        return next
      })
      setSelectedTokenPlayer(null)
    }
  }

  const hasTokenPlayers = state.players.some(
    (p, i) => i !== state.currentPlayerIndex && p.tokens > 0
  )

  const confirmPlacement = () => {
    if (pendingPosition === null) return

    pendingCard.current = state.currentCard
    setConfirmedPosition(pendingPosition)
    setPendingPosition(null)

    if (hasTokenPlayers) {
      setTokenPlacements(new Map())
      setTokenTimeRemaining(stealTimeSec)
      setSelectedTokenPlayer(null)
      setTurnPhase('tokenWindow')

      if (isHost) {
        broadcast({
          type: 'TOKEN_WINDOW',
          timeline: currentPlayer.timeline,
          card: state.currentCard!,
          timeRemaining: 5,
          takenPositions: [pendingPosition],
        })
      }
    } else {
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
    setTokenTimeRemaining(stealTimeSec)
    setSelectedTokenPlayer(null)
    setStealResult(null)

    if (state.phase === 'victory') {
      if (isHost) {
        broadcast({ type: 'GAME_OVER', winner: state.winner! })
      }
      navigate('/victory')
    } else {
      nextTurn()
      // The useEffect watching state.currentPlayerIndex will handle
      // broadcasting GAME_STATE + YOUR_TURN after the re-render
    }
  }

  const handleSkipNoPreview = () => {
    drawCard()
  }

  // Token positions map for timeline display
  const tokenPositionsMap = new Map<number, string>()
  if (turnPhase === 'tokenWindow') {
    tokenPlacements.forEach((position, playerIndex) => {
      tokenPositionsMap.set(position, state.players[playerIndex].name)
    })
  }

  const tokenEligiblePlayers = state.players
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.index !== state.currentPlayerIndex && p.tokens > 0)

  // Host is allowed to interact only on their own turn (player 0) or in local mode
  const hostCanPlace = !isMultiplayer || !isHost || state.currentPlayerIndex === 0

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="text-center mb-4 w-full max-w-lg">
        <h2 className="text-2xl sm:text-3xl font-bold text-purple-300">
          {currentPlayer.name}'s Turn
        </h2>
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
          <motion.div
            key={safeDisplayCard.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-gray-800 border-2 border-purple-500 rounded-xl flex flex-col items-center justify-center p-4"
          >
            <p className="text-base sm:text-lg font-semibold text-center leading-tight">
              {safeDisplayCard.title}
            </p>
            <p className="text-sm text-gray-400 mt-1 text-center">
              {safeDisplayCard.artist}
            </p>
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-2xl font-bold mt-2 ${wasCorrect ? 'text-green-400' : 'text-red-400'}`}
            >
              {safeDisplayCard.year}
            </motion.p>
          </motion.div>
        ) : turnPhase === 'tokenWindow' ? (
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
                style={{ width: `${(tokenTimeRemaining / stealTimeSec) * 100}%` }}
              />
            </div>
            <p className="text-2xl font-bold text-yellow-400">{tokenTimeRemaining}s</p>
          </motion.div>
        ) : turnPhase === 'waitingForGuest' ? (
          <motion.div
            key="waiting-guest"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-gray-800 border-2 border-indigo-500 rounded-xl flex flex-col items-center justify-center p-4"
          >
            <p className="text-sm text-indigo-400 mb-3">Waiting for {currentPlayer.name} to place...</p>
            <p className="text-sm text-gray-500 mb-3">Audio plays here for everyone to hear</p>
            {itunesLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Loading preview...</p>
              </div>
            ) : effectivePreviewUrl ? (
              <AudioPlayer src={effectivePreviewUrl} onPlayStateChange={handleAudioPlayStateChange} />
            ) : (
              <p className="text-gray-400">No preview available</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={safeDisplayCard.id}
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
              <AudioPlayer src={effectivePreviewUrl} onPlayStateChange={handleAudioPlayStateChange} />
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
      {turnPhase === 'placing' && hostCanPlace && (
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

      {/* Skip Song button (host's turn only) */}
      {turnPhase === 'placing' && hostCanPlace && currentPlayer.tokens > 0 && pendingPosition === null && (
        <button
          onClick={handleSkipSong}
          className="mb-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-yellow-400 text-sm font-semibold rounded-lg transition-colors cursor-pointer touch-manipulation"
        >
          Skip Song (1 token)
        </button>
      )}

      {/* Confirm / Cancel buttons */}
      {turnPhase === 'placing' && hostCanPlace && pendingPosition !== null && (
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
          showDropZones={(turnPhase === 'placing' && hostCanPlace) || turnPhase === 'tokenWindow'}
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
