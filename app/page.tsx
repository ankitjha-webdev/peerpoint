"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, VideoOff, Mic, MicOff, PhoneOff, Copy, Users, Sparkles } from "lucide-react"

export default function PeerCallApp() {
  const [isInCall, setIsInCall] = useState(false)
  const [roomId, setRoomId] = useState("")
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const [remoteConnected, setRemoteConnected] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  // Generate random room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // Copy room ID to clipboard
  const copyRoomId = async () => {
    await navigator.clipboard.writeText(roomId)
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
      return null
    }
  }

  // Create peer connection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // In a real app, send this to the other peer via signaling server
        console.log("ICE candidate:", event.candidate)
      }
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
        setRemoteConnected(true)
      }
    }

    pc.onconnectionstatechange = () => {
      setConnectionStatus(pc.connectionState as any)
    }

    return pc
  }

  // Start call
  const startCall = async () => {
    const newRoomId = generateRoomId()
    setRoomId(newRoomId)
    setIsInCall(true)
    setConnectionStatus("connecting")

    const stream = await startLocalStream()
    if (stream) {
      const pc = createPeerConnection()
      peerConnectionRef.current = pc

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      // Simulate connection after 2 seconds for demo
      setTimeout(() => {
        setConnectionStatus("connected")
        setRemoteConnected(true)
      }, 2000)
    }
  }

  // Join call
  const joinCall = async () => {
    if (!roomId.trim()) return

    setIsInCall(true)
    setConnectionStatus("connecting")

    const stream = await startLocalStream()
    if (stream) {
      const pc = createPeerConnection()
      peerConnectionRef.current = pc

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      // Simulate connection after 2 seconds for demo
      setTimeout(() => {
        setConnectionStatus("connected")
        setRemoteConnected(true)
      }, 2000)
    }
  }

  // End call
  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    setIsInCall(false)
    setConnectionStatus("disconnected")
    setRemoteConnected(false)
    setRoomId("")
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

  if (!isInCall) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=1080&width=1920')] opacity-10 bg-cover bg-center"></div>

        <Card className="w-full max-w-md backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">PeerTalk</h1>
              <p className="text-white/70">Connect instantly with anyone, anywhere</p>
            </div>

            <div className="space-y-6">
              <Button
                onClick={startCall}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105"
              >
                <Video className="w-5 h-5 mr-2" />
                Start New Call
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
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                />
                <Button
                  onClick={joinCall}
                  disabled={!roomId.trim()}
                  className="w-full h-12 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-all duration-200"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Join Call
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
          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            {connectionStatus === "connected" ? "Connected" : "Connecting..."}
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
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Remote Video */}
          <div className="relative bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {!remoteConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-white/70" />
                  </div>
                  <p className="text-white/70">Waiting for peer to join...</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4">
              <Badge className="bg-black/50 text-white border-white/20">Remote</Badge>
            </div>
          </div>

          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
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
