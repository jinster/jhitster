import { useState, useEffect, useRef, useCallback } from 'react'
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

interface PeerHostResult {
  peerId: string | null
  roomCode: string
  connections: Map<string, DataConnection>
  connectedNames: string[]
  broadcast: (message: HostMessage) => void
  sendTo: (connId: string, message: HostMessage) => void
  isReady: boolean
  onGuestMessage: React.MutableRefObject<((connId: string, message: GuestMessage) => void) | null>
}

export function usePeerHost(): PeerHostResult {
  const [peerId, setPeerId] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [connectedNames, setConnectedNames] = useState<string[]>([])
  const roomCodeRef = useRef(generateRoomCode())
  const peerRef = useRef<Peer | null>(null)
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map())
  const onGuestMessage = useRef<((connId: string, message: GuestMessage) => void) | null>(null)

  useEffect(() => {
    const roomCode = roomCodeRef.current
    const peer = new Peer(`jhitster-${roomCode}`)
    peerRef.current = peer

    peer.on('open', (id) => {
      setPeerId(id)
      setIsReady(true)
    })

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        connectionsRef.current.set(conn.peer, conn)
        setConnectedNames(Array.from(connectionsRef.current.keys()))
      })

      conn.on('data', (data) => {
        const message = data as GuestMessage
        onGuestMessage.current?.(conn.peer, message)
      })

      conn.on('close', () => {
        connectionsRef.current.delete(conn.peer)
        setConnectedNames(Array.from(connectionsRef.current.keys()))
      })
    })

    peer.on('error', (err) => {
      console.error('PeerJS host error:', err)
    })

    return () => {
      peer.destroy()
    }
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

  return {
    peerId,
    roomCode: roomCodeRef.current,
    connections: connectionsRef.current,
    connectedNames,
    broadcast,
    sendTo,
    isReady,
    onGuestMessage,
  }
}
