import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMultiplayer } from '../context/MultiplayerContext'
import Timeline from '../components/Timeline'
import type { HostMessage, Song, Player } from '../types'

type GuestPhase = 'waiting' | 'yourTurn' | 'tokenWindow' | 'turnResult' | 'gameOver'

export default function GuestController() {
  const navigate = useNavigate()
  const { guestConnected, guestError, lastHostMessage, send, playerIndex } = useMultiplayer()
  const playerName = sessionStorage.getItem('jhitster-name') ?? ''

  const [phase, setPhase] = useState<GuestPhase>('waiting')
  const [timeline, setTimeline] = useState<Song[]>([])
  const [tokens, setTokens] = useState(2)
  const [pendingPosition, setPendingPosition] = useState<number | null>(null)
  const [turnResult, setTurnResult] = useState<{ wasCorrect: boolean; card: Song; stealResult: { playerIndex: number; playerName: string } | null } | null>(null)
  const [winner, setWinner] = useState<string | null>(null)
  const [gameInfo, setGameInfo] = useState<{ players: Player[]; currentPlayerIndex: number } | null>(null)
  const [tokenTimeline, setTokenTimeline] = useState<Song[]>([])
  const [tokenTimeRemaining, setTokenTimeRemaining] = useState(0)
  const [takenPositions, setTakenPositions] = useState<number[]>([])
  const [tokenUsed, setTokenUsed] = useState(false)

  // Handle host messages
  useEffect(() => {
    if (!lastHostMessage) return

    const msg: HostMessage = lastHostMessage

    switch (msg.type) {
      case 'GAME_STATE':
        setGameInfo({ players: msg.players, currentPlayerIndex: msg.currentPlayerIndex })
        // Only go to waiting if we're not in an active interaction phase
        if (msg.currentPlayerIndex !== playerIndex && phase !== 'tokenWindow') {
          setPhase('waiting')
        }
        break

      case 'YOUR_TURN':
        setTimeline(msg.timeline)
        setTokens(msg.tokens)
        setPendingPosition(null)
        setPhase('yourTurn')
        break

      case 'TOKEN_WINDOW':
        setTokenTimeline(msg.timeline)
        setTokenTimeRemaining(msg.timeRemaining)
        setTakenPositions(msg.takenPositions)
        setTokenUsed(false)
        setPhase('tokenWindow')
        break

      case 'TURN_RESULT':
        setTurnResult({ wasCorrect: msg.wasCorrect, card: msg.card, stealResult: msg.stealResult })
        setPhase('turnResult')
        break

      case 'GAME_OVER':
        setWinner(msg.winner)
        setPhase('gameOver')
        break

      case 'PLAYER_ASSIGNMENT':
        break
    }
  }, [lastHostMessage, playerIndex, phase])

  // Local countdown timer for steal window
  useEffect(() => {
    if (phase !== 'tokenWindow') return
    if (tokenTimeRemaining <= 0) return

    const timer = setInterval(() => {
      setTokenTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [phase, tokenTimeRemaining])

  if (!guestConnected && !guestError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Connecting...</p>
      </div>
    )
  }

  if (guestError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <p className="text-red-400 text-lg mb-4">{guestError}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    )
  }

  const handleDropZoneClick = (position: number) => {
    if (phase === 'yourTurn') {
      setPendingPosition(position)
    } else if (phase === 'tokenWindow' && tokens > 0 && !tokenUsed) {
      send({ type: 'USE_TOKEN', position })
      setTokenUsed(true)
    }
  }

  const confirmPlacement = () => {
    if (pendingPosition === null) return
    send({ type: 'CONFIRM_PLACEMENT', position: pendingPosition })
    setPendingPosition(null)
    setPhase('waiting')
  }

  const cancelPlacement = () => {
    setPendingPosition(null)
  }

  const handleSkipSong = () => {
    send({ type: 'SKIP_SONG' })
  }

  // Game over screen
  if (phase === 'gameOver') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h1 className="text-4xl font-bold mb-4">{winner === playerName ? 'You Win!' : `${winner} Wins!`}</h1>
        <button
          onClick={() => navigate('/')}
          className="mt-6 w-full max-w-sm px-8 py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
        >
          Back to Home
        </button>
      </div>
    )
  }

  // Turn result screen
  if (phase === 'turnResult' && turnResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="w-full max-w-lg mb-6 bg-gray-800 border-2 border-purple-500 rounded-xl flex flex-col items-center p-4">
          <p className="text-lg font-semibold">{turnResult.card.title}</p>
          <p className="text-sm text-gray-400 mt-1">{turnResult.card.artist}</p>
          <p className={`text-2xl font-bold mt-2 ${turnResult.wasCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {turnResult.card.year}
          </p>
        </div>
        <div className={`text-lg font-bold px-4 py-3 rounded-lg mb-4 ${
          turnResult.wasCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {turnResult.wasCorrect ? 'Correct!' : 'Wrong!'}
        </div>
        {turnResult.stealResult && (
          <div className="text-lg font-bold px-4 py-3 rounded-lg bg-yellow-500/20 text-yellow-400 mb-4">
            {turnResult.stealResult.playerName} stole the card!
          </div>
        )}
      </div>
    )
  }

  // Token window
  if (phase === 'tokenWindow') {
    return (
      <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Steal Window!</h2>
        <div className="w-full max-w-lg mb-4">
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(tokenTimeRemaining / 5) * 100}%` }}
            />
          </div>
          <p className="text-center text-2xl font-bold text-yellow-400">{tokenTimeRemaining}s</p>
        </div>
        {tokens > 0 && !tokenUsed ? (
          <>
            <p className="text-gray-400 text-sm mb-2">
              Tap a position to use your token ({tokens} remaining)
            </p>
            <div className="w-full max-w-lg">
              <Timeline
                cards={tokenTimeline}
                faceUp
                showDropZones
                onDropZoneClick={handleDropZoneClick}
              />
            </div>
          </>
        ) : tokenUsed ? (
          <p className="text-yellow-400 font-semibold">Token placed! Waiting for result...</p>
        ) : (
          <p className="text-gray-500">No tokens remaining</p>
        )}
        {takenPositions.length > 0 && (
          <p className="text-gray-500 text-sm mt-2">
            Positions already claimed: {takenPositions.join(', ')}
          </p>
        )}
      </div>
    )
  }

  // Your turn
  if (phase === 'yourTurn') {
    return (
      <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
        <h2 className="text-2xl font-bold text-purple-300 mb-2">Your Turn!</h2>
        <p className="text-gray-400 text-sm mb-4">Listen on the host screen</p>

        {tokens > 0 && pendingPosition === null && (
          <button
            onClick={handleSkipSong}
            className="mb-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-yellow-400 text-sm font-semibold rounded-lg transition-colors cursor-pointer touch-manipulation"
          >
            Skip Song (1 token)
          </button>
        )}

        <p className="text-gray-400 text-sm mb-2">
          {pendingPosition !== null
            ? 'Confirm placement or tap another slot'
            : 'Tap a slot to place the song'}
        </p>

        {pendingPosition !== null && (
          <div className="flex gap-3 mb-3 w-full max-w-lg">
            <button
              onClick={confirmPlacement}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors cursor-pointer touch-manipulation"
            >
              Confirm
            </button>
            <button
              onClick={cancelPlacement}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors cursor-pointer touch-manipulation"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="w-full max-w-lg">
          <h3 className="text-sm text-gray-500 mb-1">Your Timeline ({timeline.length} cards)</h3>
          <Timeline
            cards={timeline}
            faceUp
            showDropZones
            onDropZoneClick={handleDropZoneClick}
            pendingPosition={pendingPosition}
          />
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Tokens: {tokens}
        </div>
      </div>
    )
  }

  // Waiting phase (default)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h2 className="text-2xl font-bold text-purple-300 mb-4">
        {playerName}
      </h2>
      {gameInfo ? (
        <>
          <p className="text-gray-400 mb-6">
            {gameInfo.players[gameInfo.currentPlayerIndex]?.name}'s turn
          </p>
          <div className="w-full max-w-md">
            <h3 className="text-sm text-gray-500 mb-2">Players</h3>
            {gameInfo.players.map((p, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg mb-2 ${
                  i === gameInfo.currentPlayerIndex ? 'bg-purple-600/20 border border-purple-500' : 'bg-gray-800'
                }`}
              >
                <span>{p.name}</span>
                <span className="text-sm text-gray-400">{p.timeline.length} cards | {p.tokens} tokens</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Waiting for the game to start...</p>
        </>
      )}
    </div>
  )
}
