import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react'
import Peer, { type DataConnection } from 'peerjs'
import type { HostMessage, GuestMessage } from '../types'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

interface MultiplayerContextValue {
  role: 'host' | 'guest' | null
  roomCode: string
  playerIndex: number
  setPlayerIndex: (idx: number) => void
  isReady: boolean

  // Host
  startHost: () => void
  broadcast: (message: HostMessage) => void
  sendTo: (connId: string, message: HostMessage) => void
  onGuestMessage: React.MutableRefObject<((connId: string, message: GuestMessage) => void) | null>
  connectedNames: string[]

  // Guest
  joinRoom: (code: string, name: string) => void
  send: (message: GuestMessage) => void
  lastHostMessage: HostMessage | null
  guestConnected: boolean
  guestError: string | null

  // Cleanup
  disconnect: () => void
}

const MultiplayerContext = createContext<MultiplayerContextValue | null>(null)

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<'host' | 'guest' | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [playerIndex, setPlayerIndex] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [connectedNames, setConnectedNames] = useState<string[]>([])
  const [lastHostMessage, setLastHostMessage] = useState<HostMessage | null>(null)
  const [guestConnected, setGuestConnected] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)

  const peerRef = useRef<Peer | null>(null)
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map())
  const connRef = useRef<DataConnection | null>(null)
  const onGuestMessage = useRef<((connId: string, message: GuestMessage) => void) | null>(null)

  const startHost = useCallback(() => {
    // Don't create a new peer if one already exists
    if (peerRef.current && !peerRef.current.destroyed) return

    const code = generateRoomCode()
    setRoomCode(code)
    setRole('host')
    setIsReady(false)

    const peer = new Peer(`jhitster-${code}`)
    peerRef.current = peer

    peer.on('open', () => {
      setIsReady(true)
    })

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        connectionsRef.current.set(conn.peer, conn)
        setConnectedNames(Array.from(connectionsRef.current.keys()))
      })

      conn.on('data', (data) => {
        onGuestMessage.current?.(conn.peer, data as GuestMessage)
      })

      conn.on('close', () => {
        connectionsRef.current.delete(conn.peer)
        setConnectedNames(Array.from(connectionsRef.current.keys()))
      })
    })

    peer.on('error', (err) => {
      console.error('PeerJS host error:', err)
    })
  }, [])

  const joinRoom = useCallback((code: string, _name: string) => {
    // Don't create a new peer if one already exists and is connected
    if (peerRef.current && !peerRef.current.destroyed) return

    setRoomCode(code)
    setRole('guest')
    setGuestConnected(false)
    setGuestError(null)

    const peer = new Peer()
    peerRef.current = peer

    peer.on('open', () => {
      const conn = peer.connect(`jhitster-${code}`)
      connRef.current = conn

      conn.on('open', () => {
        setGuestConnected(true)
        setGuestError(null)
      })

      conn.on('data', (data) => {
        setLastHostMessage(data as HostMessage)
      })

      conn.on('close', () => {
        setGuestConnected(false)
      })

      conn.on('error', (err) => {
        console.error('PeerJS guest connection error:', err)
        setGuestError('Connection error. Try again.')
      })
    })

    peer.on('error', (err) => {
      console.error('PeerJS guest error:', err)
      if (err.type === 'peer-unavailable') {
        setGuestError('Room not found. Check the code and try again.')
      } else {
        setGuestError(`Connection error: ${err.type}`)
      }
    })
  }, [])

  const broadcast = useCallback((message: HostMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) conn.send(message)
    })
  }, [])

  const sendTo = useCallback((connId: string, message: HostMessage) => {
    const conn = connectionsRef.current.get(connId)
    if (conn?.open) conn.send(message)
  }, [])

  const send = useCallback((message: GuestMessage) => {
    if (connRef.current?.open) {
      connRef.current.send(message)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    connectionsRef.current.clear()
    connRef.current = null
    setRole(null)
    setRoomCode('')
    setIsReady(false)
    setConnectedNames([])
    setGuestConnected(false)
    setGuestError(null)
    setLastHostMessage(null)
  }, [])

  return (
    <MultiplayerContext.Provider
      value={{
        role,
        roomCode,
        playerIndex,
        setPlayerIndex,
        isReady,
        startHost,
        broadcast,
        sendTo,
        onGuestMessage,
        connectedNames,
        joinRoom,
        send,
        lastHostMessage,
        guestConnected,
        guestError,
        disconnect,
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
