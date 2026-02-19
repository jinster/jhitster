import { createContext, useContext, useState, type ReactNode } from 'react'
import type { HostMessage, GuestMessage } from '../types'
import type { DataConnection } from 'peerjs'

interface MultiplayerContextValue {
  role: 'host' | 'guest' | null
  setRole: (role: 'host' | 'guest' | null) => void
  roomCode: string
  setRoomCode: (code: string) => void
  playerIndex: number
  setPlayerIndex: (idx: number) => void
  // Host-specific
  broadcast: ((message: HostMessage) => void) | null
  setBroadcast: (fn: ((message: HostMessage) => void) | null) => void
  connections: Map<string, DataConnection>
  setConnections: (conns: Map<string, DataConnection>) => void
  // Guest-specific
  send: ((message: GuestMessage) => void) | null
  setSend: (fn: ((message: GuestMessage) => void) | null) => void
  lastHostMessage: HostMessage | null
  setLastHostMessage: (msg: HostMessage | null) => void
}

const MultiplayerContext = createContext<MultiplayerContextValue | null>(null)

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<'host' | 'guest' | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [playerIndex, setPlayerIndex] = useState(0)
  const [broadcast, setBroadcastState] = useState<((message: HostMessage) => void) | null>(null)
  const [connections, setConnections] = useState<Map<string, DataConnection>>(new Map())
  const [send, setSendState] = useState<((message: GuestMessage) => void) | null>(null)
  const [lastHostMessage, setLastHostMessage] = useState<HostMessage | null>(null)

  // Wrap setState to handle function values properly
  const setBroadcast = (fn: ((message: HostMessage) => void) | null) => {
    setBroadcastState(() => fn)
  }
  const setSend = (fn: ((message: GuestMessage) => void) | null) => {
    setSendState(() => fn)
  }

  return (
    <MultiplayerContext.Provider
      value={{
        role,
        setRole,
        roomCode,
        setRoomCode,
        playerIndex,
        setPlayerIndex,
        broadcast,
        setBroadcast,
        connections,
        setConnections,
        send,
        setSend,
        lastHostMessage,
        setLastHostMessage,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  )
}

export function useMultiplayer(): MultiplayerContextValue {
  const context = useContext(MultiplayerContext)
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider')
  }
  return context
}
