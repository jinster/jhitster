import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMultiplayer } from '../context/MultiplayerContext'

export default function JoinGame() {
  const navigate = useNavigate()
  const { joinRoom, guestConnected, guestError, lastHostMessage, send, setPlayerIndex } = useMultiplayer()
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [assignedIndex, setAssignedIndex] = useState<number | null>(null)

  // Send JOIN message once connected
  useEffect(() => {
    if (guestConnected && submitted && playerName.trim()) {
      send({ type: 'JOIN', requestedName: playerName.trim() })
    }
  }, [guestConnected, submitted, playerName, send])

  // Handle host messages
  useEffect(() => {
    if (!lastHostMessage) return

    if (lastHostMessage.type === 'PLAYER_ASSIGNMENT') {
      setAssignedIndex(lastHostMessage.playerIndex)
      setPlayerIndex(lastHostMessage.playerIndex)
    }

    if (lastHostMessage.type === 'GAME_STATE' && lastHostMessage.phase === 'playing') {
      // Store info in sessionStorage for page refreshes
      sessionStorage.setItem('jhitster-name', playerName.trim())
      sessionStorage.setItem('jhitster-index', String(assignedIndex ?? 0))
      navigate('/guest-play')
    }
  }, [lastHostMessage, playerName, assignedIndex, navigate, setPlayerIndex])

  const handleSubmit = () => {
    if (!roomCode.trim() || !playerName.trim()) return
    setSubmitted(true)
    joinRoom(roomCode.toUpperCase(), playerName.trim())
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        {guestError ? (
          <>
            <p className="text-red-400 text-lg mb-4">{guestError}</p>
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </>
        ) : guestConnected ? (
          <>
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-lg font-semibold text-purple-300">Connected!</p>
            <p className="text-gray-400 mt-2">
              {assignedIndex !== null
                ? `You are Player ${assignedIndex + 1}. Waiting for host to start...`
                : 'Waiting for host to assign you...'}
            </p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Connecting to room {roomCode.toUpperCase()}...</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-8">Join a Game</h1>

      <div className="w-full max-w-md mb-4">
        <label className="text-sm text-gray-400 mb-2 block">Your Name</label>
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full min-h-[48px] px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="w-full max-w-md mb-8">
        <label className="text-sm text-gray-400 mb-2 block">Room Code</label>
        <input
          type="text"
          placeholder="Enter 6-character code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
          maxLength={6}
          className="w-full min-h-[48px] px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-2xl font-mono text-center tracking-widest focus:outline-none focus:border-purple-500 uppercase"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={roomCode.length < 6 || !playerName.trim()}
        className="w-full max-w-md px-8 py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
      >
        Join
      </button>

      <button
        onClick={() => navigate('/multiplayer')}
        className="mt-4 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
      >
        Back
      </button>
    </div>
  )
}
