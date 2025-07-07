import { useState, useRef, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseWebRTCProps {
  roomId: string
  onRemoteStream?: (stream: MediaStream) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  onUserJoined?: (userId: string) => void
  onUserLeft?: (userId: string) => void
  onError?: (message: string) => void
  onRoomFull?: (message: string) => void
}

// Get Socket.IO server URL from environment or default to localhost
const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    // In browser, check for environment variable or use localhost
    return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
  }
  return 'http://localhost:3001'
}

export function useWebRTC({
  roomId,
  onRemoteStream,
  onConnectionStateChange,
  onUserJoined,
  onUserLeft,
  onError,
  onRoomFull,
}: UseWebRTCProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new')
  const [remoteUsers, setRemoteUsers] = useState<string[]>([])
  const [socketConnected, setSocketConnected] = useState(false)
  
  const socketRef = useRef<Socket | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const currentRoomRef = useRef<string | null>(null)

  // Initialize Socket.IO connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current) return

    const socketUrl = getSocketUrl()
    console.log('🔌 Connecting to Socket.IO server at:', socketUrl)
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    })

    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server')
      setSocketConnected(true)
      
      // Join the room immediately after connection
      if (roomId && currentRoomRef.current !== roomId) {
        currentRoomRef.current = roomId
        socket.emit('join-room', roomId)
      }
    })

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO server')
      setSocketConnected(false)
      currentRoomRef.current = null
    })

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error)
      setSocketConnected(false)
    })

    socket.on('user-joined', ({ userId }: { userId: string }) => {
      console.log('👋 User joined:', userId)
      setRemoteUsers(prev => {
        // Prevent duplicate users
        if (prev.includes(userId)) return prev
        return [...prev, userId]
      })
      onUserJoined?.(userId)
    })

    socket.on('user-left', ({ userId }: { userId: string }) => {
      console.log('👋 User left:', userId)
      setRemoteUsers(prev => prev.filter(id => id !== userId))
      onUserLeft?.(userId)
    })

    socket.on('room-info', ({ numUsers }: { numUsers: number }) => {
      console.log(`📊 Room has ${numUsers} users`)
    })

    socket.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      console.log('📥 Received offer from:', from)
      if (!peerConnectionRef.current) return

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await peerConnectionRef.current.createAnswer()
        await peerConnectionRef.current.setLocalDescription(answer)
        
        socket.emit('answer', {
          roomId,
          answer: peerConnectionRef.current.localDescription,
        })
        console.log('📤 Sent answer to:', from)
      } catch (error) {
        console.error('❌ Error handling offer:', error)
      }
    })

    socket.on('answer', async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
      console.log('📥 Received answer from:', from)
      if (!peerConnectionRef.current) return

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (error) {
        console.error('❌ Error handling answer:', error)
      }
    })

    socket.on('ice-candidate', async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
      console.log('🧊 Received ICE candidate from:', from)
      if (!peerConnectionRef.current) return

      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error)
      }
    })

    socket.on('room-full', ({ message }) => {
      console.error(message);
      if (typeof onRoomFull === 'function') onRoomFull(message);
    })

    socketRef.current = socket
  }, [roomId, onUserJoined, onUserLeft, onError, onRoomFull])

  // Join room function
  const joinRoom = useCallback((newRoomId: string) => {
    if (!socketRef.current || !socketConnected) {
      console.log('⚠️ Socket not connected, cannot join room')
      return
    }

    // If already in the same room, don't join again
    if (currentRoomRef.current === newRoomId) {
      console.log('⚠️ Already in room:', newRoomId)
      return
    }

    // Leave current room if different
    if (currentRoomRef.current && currentRoomRef.current !== newRoomId) {
      console.log('🚪 Leaving current room:', currentRoomRef.current)
      socketRef.current.emit('leave-room', currentRoomRef.current)
    }

    // Join new room
    console.log('🚪 Joining room:', newRoomId)
    currentRoomRef.current = newRoomId
    socketRef.current.emit('join-room', newRoomId)
  }, [socketConnected])

  // Create and configure peer connection
  const createPeerConnection = useCallback(() => {
    console.log('🔗 Creating RTCPeerConnection...')
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    })

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('🧊 Sending ICE candidate...')
        socketRef.current.emit('ice-candidate', {
          roomId,
          candidate: event.candidate,
        })
      }
    }

    pc.ontrack = (event) => {
      console.log('📹 Received remote stream')
      onRemoteStream?.(event.streams[0])
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log('🔗 Connection state changed:', state)
      setConnectionState(state)
      setIsConnected(state === 'connected')
      onConnectionStateChange?.(state)
    }

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', pc.iceConnectionState)
    }

    pc.onicegatheringstatechange = () => {
      console.log('🧊 ICE gathering state:', pc.iceGatheringState)
    }

    return pc
  }, [roomId, onRemoteStream, onConnectionStateChange])

  // Start local stream and peer connection
  const startCall = useCallback(async (stream: MediaStream) => {
    console.log('🎬 Starting call with stream...')
    localStreamRef.current = stream
    const pc = createPeerConnection()
    peerConnectionRef.current = pc

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      console.log('➕ Adding track to peer connection:', track.kind)
      pc.addTrack(track, stream)
    })

    // Join the room via Socket.IO
    joinRoom(roomId)

    // If we're the first user, create an offer after a short delay
    setTimeout(async () => {
      if (remoteUsers.length === 0 && peerConnectionRef.current) {
        try {
          console.log('📤 Creating offer...')
          const offer = await peerConnectionRef.current.createOffer()
          await peerConnectionRef.current.setLocalDescription(offer)
          
          socketRef.current?.emit('offer', {
            roomId,
            offer: peerConnectionRef.current.localDescription,
          })
          console.log('📤 Offer sent')
        } catch (error) {
          console.error('❌ Error creating offer:', error)
        }
      }
    }, 1000)
  }, [createPeerConnection, remoteUsers.length, roomId, joinRoom])

  // Leave room function
  const leaveRoom = useCallback(() => {
    if (socketRef.current && currentRoomRef.current) {
      console.log('🚪 Leaving room:', currentRoomRef.current)
      socketRef.current.emit('leave-room', currentRoomRef.current)
      currentRoomRef.current = null
    }
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up WebRTC resources...')
    
    // Leave current room
    leaveRoom()
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('🛑 Stopping track:', track.kind)
        track.stop()
      })
      localStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    setIsConnected(false)
    setConnectionState('new')
    setRemoteUsers([])
    setSocketConnected(false)
    currentRoomRef.current = null
  }, [leaveRoom])

  // Initialize Socket.IO when roomId changes
  useEffect(() => {
    if (roomId) {
      initializeSocket()
    }
  }, [roomId, initializeSocket])

  // Join room when socket connects or roomId changes
  useEffect(() => {
    if (socketConnected && roomId) {
      joinRoom(roomId)
    }
  }, [socketConnected, roomId, joinRoom])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    isConnected,
    connectionState,
    remoteUsers,
    socketConnected,
    startCall,
    cleanup,
    leaveRoom,
  }
} 