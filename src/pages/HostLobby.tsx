import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { usePeerHost } from '../hooks/usePeerHost'
import { packs } from '../data/packs'
import type { Song, GuestMessage } from '../types'

export default function HostLobby() {
  const navigate = useNavigate()
  const { setPacks, setPlayers, dealInitialCards, state } = useGame()
  const { roomCode, isReady, connectedNames, broadcast, sendTo, onGuestMessage } = usePeerHost()

  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(new Set([packs[0].meta.id]))
  const [hostName, setHostName] = useState('')
  const [guestNames, setGuestNames] = useState<Map<string, string>>(new Map())
  const [phase, setPhase] = useState<'config' | 'waiting'>('config')
  const [copied, setCopied] = useState(false)

  // Store broadcast ref for use in GameScreen
  const broadcastRef = useRef(broadcast)
  broadcastRef.current = broadcast
  const sendToRef = useRef(sendTo)
  sendToRef.current = sendTo

  // Handle guest messages
  const handleGuestMessage = useCallback((connId: string, message: GuestMessage) => {
    if (message.type === 'JOIN') {
      setGuestNames((prev) => {
        const next = new Map(prev)
        next.set(connId, message.requestedName)
        return next
      })
      // Send assignment
      const idx = guestNames.size + 1 // Host is 0
      sendToRef.current(connId, {
        type: 'PLAYER_ASSIGNMENT',
        playerIndex: idx,
        playerName: message.requestedName,
      })
    }
  }, [guestNames.size])

  useEffect(() => {
    onGuestMessage.current = handleGuestMessage
  }, [handleGuestMessage, onGuestMessage])

  const togglePack = (id: string) => {
    setSelectedPacks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size > 1) next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleProceedToWaiting = async () => {
    if (!hostName.trim()) return
    const selectedPackList = packs.filter((p) => selectedPacks.has(p.meta.id))
    const loaded = await Promise.all(selectedPackList.map((p) => p.load()))
    const allSongs: Song[] = loaded.flat()
    setPacks([...selectedPacks], allSongs)
    setPhase('waiting')
  }

  const handleStartGame = () => {
    const allNames = [hostName.trim(), ...Array.from(guestNames.values())]
    setPlayers(allNames)

    // Small delay to let state update, then deal and navigate
    setTimeout(() => {
      dealInitialCards(0)

      // Broadcast initial game state to guests
      broadcastRef.current({
        type: 'GAME_STATE',
        players: state.players,
        currentPlayerIndex: state.currentPlayerIndex,
        phase: state.phase,
        targetTimelineLength: state.targetTimelineLength,
        deckSize: state.deck.length,
      })

      navigate('/deal')
    }, 50)
  }

  if (phase === 'config') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h1 className="text-4xl font-bold mb-6">Host a Game</h1>

        <div className="w-full max-w-md mb-6">
          <label className="text-sm text-gray-400 mb-2 block">Your Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            className="w-full min-h-[48px] px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="w-full max-w-md mb-6">
          <h2 className="text-lg font-semibold mb-3">Song Packs</h2>
          <div className="flex flex-col gap-3">
            {packs.map((pack) => {
              const isSelected = selectedPacks.has(pack.meta.id)
              return (
                <button
                  key={pack.meta.id}
                  onClick={() => togglePack(pack.meta.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-colors cursor-pointer touch-manipulation ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                  }`}
                >
                  <h3 className="font-semibold">{pack.meta.name}</h3>
                  <p className="text-sm text-gray-400">{pack.meta.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        <button
          onClick={handleProceedToWaiting}
          disabled={!hostName.trim()}
          className="w-full max-w-md px-8 py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
        >
          Continue
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-4">Waiting for Players</h1>

      {/* Room code */}
      <div className="mb-8 text-center">
        <p className="text-gray-400 text-sm mb-2">Share this room code:</p>
        <button
          onClick={handleCopyCode}
          className="text-5xl font-mono font-bold text-purple-400 tracking-widest cursor-pointer hover:text-purple-300 transition-colors"
        >
          {isReady ? roomCode : '...'}
        </button>
        <p className="text-sm text-gray-500 mt-1">
          {copied ? 'Copied!' : 'Tap to copy'}
        </p>
      </div>

      {/* Connected players */}
      <div className="w-full max-w-md mb-8">
        <h2 className="text-lg font-semibold mb-3">Players</h2>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-purple-500">
            <span className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span className="font-semibold">{hostName}</span>
            <span className="text-xs text-purple-400 ml-auto">Host</span>
          </div>
          {Array.from(guestNames.entries()).map(([, name], i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-600">
              <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">{i + 2}</span>
              <span>{name}</span>
            </div>
          ))}
          {guestNames.size === 0 && (
            <p className="text-gray-500 text-center py-4">Waiting for guests to connect...</p>
          )}
        </div>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        {connectedNames.length} guest{connectedNames.length !== 1 ? 's' : ''} connected
      </p>

      <button
        onClick={handleStartGame}
        disabled={guestNames.size === 0}
        className="w-full max-w-md px-8 py-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-xl transition-colors cursor-pointer touch-manipulation"
      >
        Start Game
      </button>
    </div>
  )
}
