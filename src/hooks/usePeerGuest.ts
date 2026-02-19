import { useState, useEffect, useRef, useCallback } from 'react'
import Peer, { type DataConnection } from 'peerjs'
import type { HostMessage, GuestMessage } from '../types'

interface PeerGuestResult {
  connected: boolean
  send: (message: GuestMessage) => void
  lastMessage: HostMessage | null
  error: string | null
}

export function usePeerGuest(roomCode: string): PeerGuestResult {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<HostMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const peerRef = useRef<Peer | null>(null)
  const connRef = useRef<DataConnection | null>(null)

  useEffect(() => {
    if (!roomCode) return

    const peer = new Peer()
    peerRef.current = peer

    peer.on('open', () => {
      const conn = peer.connect(`jhitster-${roomCode}`)
      connRef.current = conn

      conn.on('open', () => {
        setConnected(true)
        setError(null)
      })

      conn.on('data', (data) => {
        setLastMessage(data as HostMessage)
      })

      conn.on('close', () => {
        setConnected(false)
      })

      conn.on('error', (err) => {
        console.error('PeerJS guest connection error:', err)
        setError('Connection error. Try again.')
      })
    })

    peer.on('error', (err) => {
      console.error('PeerJS guest error:', err)
      if (err.type === 'peer-unavailable') {
        setError('Room not found. Check the code and try again.')
      } else {
        setError(`Connection error: ${err.type}`)
      }
    })

    return () => {
      peer.destroy()
    }
  }, [roomCode])

  const send = useCallback((message: GuestMessage) => {
    if (connRef.current?.open) {
      connRef.current.send(message)
    }
  }, [])

  return { connected, send, lastMessage, error }
}
