"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, VideoOff, Mic, MicOff, PhoneOff, Copy, Users, Sparkles, AlertCircle } from "lucide-react"
import { useWebRTC } from "@/hooks/use-webrtc"
import { useToast } from "@/hooks/use-toast"
import { Howl } from 'howler'

export default function PeerCallApp() {
  const [isInCall, setIsInCall] = useState(false)
  const [roomId, setRoomId] = useState("")
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roomFull, setRoomFull] = useState(false)
  const [lastFullRoomId, setLastFullRoomId] = useState<string | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const { toast } = useToast()

  // WebRTC hook
  const {
    isConnected,
    connectionState,
    remoteUsers,
    socketConnected,
    startCall,
    cleanup,
    leaveRoom,
  } = useWebRTC({
    roomId,
    onRemoteStream: (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream
      }
    },
    onConnectionStateChange: (state) => {
      console.log('Connection state changed:', state)
      if (state === 'failed' || state === 'disconnected') {
        setError('Connection lost. Please try again.')
      }
    },
    onUserJoined: (userId) => {
      toast({
        title: "Peer joined",
        description: "Another user has joined the call",
      })
    },
    onUserLeft: (userId) => {
      toast({
        title: "Peer left",
        description: "The other user has left the call",
        variant: "destructive",
      })
    },
    onRoomFull: (message) => {
      setError(message)
      setIsInCall(false)
      setRoomFull(true)
      setLastFullRoomId(roomId)
    },
  })

  // Generate random room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // Copy room ID to clipboard
  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      toast({
        title: "Room ID copied",
        description: "Room ID has been copied to clipboard",
      })
    } catch (error) {
      console.error('Failed to copy room ID:', error)
    }
  }

  // Start local video stream
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled,
      })

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      return stream
    } catch (error) {
      console.error("Error accessing media devices:", error)
      setError("Failed to access camera/microphone. Please check permissions.")
      return null
    }
  }

  // Utility to play a sound
  const playSound = (src: string) => {
    new Howl({ src: [src], volume: 1.0 }).play()
  }

  // Start new call
  const startNewCall = async () => {
    setIsLoading(true)
    setError(null)
    setRoomFull(false)
    
    const newRoomId = generateRoomId()
    setRoomId(newRoomId)
    setIsInCall(true)
    playSound('/join.mp3')

    const stream = await startLocalStream()
    if (stream) {
      await startCall(stream)
    } else {
      setIsInCall(false)
    }
    
    setIsLoading(false)
  }

  // Join call
  const joinCall = async () => {
    if (!roomId.trim() || roomFull) return
    setIsLoading(true)
    setError(null)
    setRoomFull(false)
    setIsInCall(true)
    playSound('/join.mp3')

    const stream = await startLocalStream()
    if (stream) {
      await startCall(stream)
    } else {
      setIsInCall(false)
    }
    
    setIsLoading(false)
  }

  // End call
  const endCall = () => {
    // Leave room first, then cleanup
    leaveRoom()
    cleanup()
    setIsInCall(false)
    setRoomId("")
    setError(null)
    playSound('/leave.mp3')
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
      }
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom()
      cleanup()
    }
  }, [cleanup, leaveRoom])

  // When user changes roomId input, clear roomFull and error if new value is different from lastFullRoomId
  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRoomId = e.target.value.toUpperCase()
    setRoomId(newRoomId)
    if (lastFullRoomId && newRoomId !== lastFullRoomId) {
      setRoomFull(false)
      setError(null)
      setLastFullRoomId(null)
    }
  }

  // Auto-dismiss error after 4 seconds (do NOT clear roomFull here)
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Keyboard shortcuts for mute/unmute and camera on/off
  useEffect(() => {
    if (!isInCall) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        toggleAudio()
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        toggleVideo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isInCall, toggleAudio, toggleVideo])

  if (!isInCall) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=1080&width=1920')] opacity-10 bg-cover bg-center"></div>

        {/* Error Display */}
        {error && (
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md p-3 bg-[#e53935] border border-[#b71c1c] rounded-lg flex items-center space-x-2 shadow-lg text-white font-semibold">
            <AlertCircle className="w-4 h-4 text-white" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <Card className="w-full max-w-md backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl mt-8">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">PeerPoint</h1>
              <p className="text-white/70">Connect instantly with anyone, anywhere</p>
            </div>

            <div className="space-y-6">
              <Button
                onClick={startNewCall}
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
              >
                <Video className="w-5 h-5 mr-2" />
                {isLoading ? "Starting..." : "Start New Call"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-white/70">or</span>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Enter Room ID"
                  value={roomId}
                  onChange={handleRoomIdChange}
                  className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                />
                <Button
                  onClick={joinCall}
                  disabled={!roomId.trim() || isLoading || (roomFull && roomId === lastFullRoomId)}
                  className="w-full h-12 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <Users className="w-5 h-5 mr-2" />
                  {isLoading ? "Joining..." : "Join Call"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <Badge 
            variant="secondary" 
            className={`${
              socketConnected 
                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                : "bg-red-500/20 text-red-400 border-red-500/30"
            }`}
          >
            <div className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
              socketConnected ? "bg-green-400" : "bg-red-400"
            }`}></div>
            {socketConnected ? "Socket Connected" : "Socket Disconnected"}
          </Badge>
          <Badge 
            variant="secondary" 
            className={`${
              connectionState === "connected" 
                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
            }`}
          >
            <div className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
              connectionState === "connected" ? "bg-green-400" : "bg-yellow-400"
            }`}></div>
            {connectionState === "connected" ? "Peer Connected" : 
             connectionState === "connecting" ? "Connecting..." :
             connectionState === "new" ? "Initializing..." : connectionState}
          </Badge>
          {roomId && (
            <div className="flex items-center space-x-2">
              <span className="text-white/70 text-sm">Room:</span>
              <Badge variant="outline" className="text-white border-white/30">
                {roomId}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyRoomId}
                className="h-6 w-6 p-0 text-white/70 hover:text-white"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          )}
          {remoteUsers.length > 0 && (
            <Badge variant="outline" className="text-white border-white/30">
              <Users className="w-3 h-3 mr-1" />
              {remoteUsers.length} peer{remoteUsers.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Video Area */}
      <div className="flex-1 relative p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Remote Video */}
          <div className="relative bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-white/70" />
                  </div>
                  <p className="text-white/70">Waiting for peer to join...</p>
                  <p className="text-white/50 text-sm mt-2">Share the room ID with someone to start talking</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4">
              <Badge className="bg-black/50 text-white border-white/20">Remote</Badge>
            </div>
          </div>

          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-gray-400" />
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4">
              <Badge className="bg-black/50 text-white border-white/20">You</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={toggleAudio}
            size="lg"
            variant={isAudioEnabled ? "secondary" : "destructive"}
            className="w-14 h-14 rounded-full"
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>

          <Button
            onClick={toggleVideo}
            size="lg"
            variant={isVideoEnabled ? "secondary" : "destructive"}
            className="w-14 h-14 rounded-full"
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          <Button
            onClick={endCall}
            size="lg"
            variant="destructive"
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}

