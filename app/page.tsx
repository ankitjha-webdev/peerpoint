"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, VideoOff, Mic, MicOff, PhoneOff, Copy, Users, Sparkles, AlertCircle, X, Link2 } from "lucide-react"
import { useWebRTC } from "@/hooks/use-webrtc"
import { useToast } from "@/hooks/use-toast"
import { Howl } from 'howler'
import { useRouter, useSearchParams } from 'next/navigation'

export default function PeerCallApp() {
  const [isInCall, setIsInCall] = useState(false)
  const [roomId, setRoomId] = useState("")
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roomFull, setRoomFull] = useState(false)
  const [lastFullRoomId, setLastFullRoomId] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null)
  const [showSharePopup, setShowSharePopup] = useState(false)
  const shareTimeout = useRef<NodeJS.Timeout | null>(null)
  const [hasLocalStream, setHasLocalStream] = useState(false)

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
      setHasLocalStream(true)
      return stream
    } catch (error) {
      console.error("Error accessing media devices:", error)
      setError("Failed to access camera/microphone. Please check permissions.")
      setHasLocalStream(false)
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
    setHasLocalStream(false)
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

  // Show controls on user interaction, hide after 3s
  const triggerControls = useCallback(() => {
    setShowControls(true)
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current)
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  // Show share popup when call starts
  useEffect(() => {
    if (isInCall && roomId) {
      setShowSharePopup(true)
      if (shareTimeout.current) clearTimeout(shareTimeout.current)
      shareTimeout.current = setTimeout(() => setShowSharePopup(false), 8000)
    }
    return () => {
      if (shareTimeout.current) clearTimeout(shareTimeout.current)
    }
  }, [isInCall, roomId])

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

  // Show controls on tap/click/move
  useEffect(() => {
    if (!isInCall) return
    const show = () => triggerControls()
    window.addEventListener('mousemove', show)
    window.addEventListener('touchstart', show)
    window.addEventListener('keydown', show)
    return () => {
      window.removeEventListener('mousemove', show)
      window.removeEventListener('touchstart', show)
      window.removeEventListener('keydown', show)
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current)
    }
  }, [isInCall, triggerControls])

  // Ensure local video element always gets the stream after mount/remount
  useEffect(() => {
    if (hasLocalStream && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [hasLocalStream, localVideoRef])

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

  // Auto-join if roomId is present in URL
  useEffect(() => {
    if (!isInCall && searchParams) {
      const urlRoomId = searchParams.get('roomId')?.toUpperCase()
      if (urlRoomId && urlRoomId !== roomId) {
        setRoomId(urlRoomId)
        joinCall()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  if (isInCall) {
    const shareUrl = typeof window !== 'undefined' && roomId ? `${window.location.origin}/?roomId=${roomId}` : ''
    return (
      <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
        {/* Share Link Popup */}
        {showSharePopup && shareUrl && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white text-black rounded-xl shadow-lg px-6 py-4 flex items-center space-x-3 border border-gray-200 animate-fade-in">
            <Link2 className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-sm truncate max-w-[120px] sm:max-w-xs">{shareUrl}</span>
            <Button
              size="sm"
              variant="secondary"
              className="px-2 py-1 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl)
                toast({ title: "Link copied!", description: "Share this link to invite someone." })
              }}
            >
              Copy
            </Button>
            {/* Mobile Share Button */}
            <Button
              size="sm"
              variant="outline"
              className="px-2 py-1 text-xs hidden sm:inline-flex"
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: 'Join my PeerPoint call',
                      text: 'Join my PeerPoint call!',
                      url: shareUrl,
                    })
                    toast({ title: "Shared!", description: "Link shared successfully." })
                  } catch (err) {
                    toast({ title: "Share cancelled", description: "You cancelled sharing." })
                  }
                } else {
                  navigator.clipboard.writeText(shareUrl)
                  toast({ title: "Link copied!", description: "Share this link to invite someone." })
                }
              }}
            >
              Share
            </Button>
            <button
              className="ml-2 p-1 rounded hover:bg-gray-100"
              onClick={() => setShowSharePopup(false)}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Remote Video Fullscreen */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 bg-black"
        />

        {/* Floating Local Video PiP */}
        {hasLocalStream && (
          <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-36 sm:h-52 rounded-xl shadow-lg border border-white/20 overflow-hidden z-20 bg-black/80 flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1] rounded-xl"
            />
          </div>
        )}

        {/* Controls - auto-hide */}
        <div
          className={`absolute bottom-0 left-0 w-full flex items-center justify-center pb-8 z-30 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <div className="flex items-center space-x-4 bg-black/60 rounded-2xl px-6 py-4 shadow-xl backdrop-blur-md">
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

        {/* Tap to show controls on mobile */}
        <div
          className="absolute inset-0 z-10"
          onClick={triggerControls}
          onTouchStart={triggerControls}
          style={{ cursor: 'pointer' }}
        />
      </div>
    )
  }
}

