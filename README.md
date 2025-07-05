# PeerTalk - Real-time Video Calls with WebRTC

A modern peer-to-peer video calling application built with Next.js, WebRTC, and Socket.IO.

## Features

- 🎥 Real-time video and audio calls
- 🔗 Peer-to-peer connections using WebRTC
- 📡 Real-time signaling with Socket.IO
- 🎨 Modern, responsive UI with Tailwind CSS
- 📱 Mobile-friendly design
- 🔐 Secure peer-to-peer communication

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Real-time**: Socket.IO (client & server)
- **WebRTC**: Native browser APIs
- **Signaling**: Custom Socket.IO server

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd funtalk
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start both servers (recommended)**
   ```bash
   pnpm run dev:all
   ```
   
   This will start:
   - Next.js app on http://localhost:3000
   - Socket.IO server on http://localhost:3001

### Alternative: Run servers separately

If you prefer to run servers separately:

**Terminal 1 - Next.js app:**
```bash
pnpm dev
```

**Terminal 2 - Socket.IO server:**
```bash
pnpm run socket
```

## How to Use

1. **Start a call**: Click "Start New Call" to create a new room
2. **Share room ID**: Copy the generated room ID and share it with someone
3. **Join a call**: Enter the room ID and click "Join Call"
4. **Talk**: Once connected, you can see and hear each other!

## How It Works

### WebRTC Signaling Flow

1. **Connection**: Both peers connect to Socket.IO server
2. **Room Join**: Peers join the same room via Socket.IO
3. **Offer/Answer**: First peer creates and sends an offer, second peer responds with answer
4. **ICE Candidates**: Both peers exchange ICE candidates for NAT traversal
5. **Media Streams**: Once connected, video/audio streams flow directly between peers

### Architecture

```
Peer A ←→ Socket.IO Server ←→ Peer B
   ↓                              ↓
WebRTC Connection (P2P) ←→ WebRTC Connection
```

## Development

### Project Structure

```
funtalk/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main video call interface
│   ├── layout.tsx         # Root layout with Toaster
│   └── globals.css        # Global styles
├── hooks/
│   └── use-webrtc.ts      # WebRTC logic with Socket.IO
├── components/
│   └── ui/                # shadcn/ui components
├── server.js              # Socket.IO signaling server
└── package.json
```

### Key Files

- **`server.js`**: Socket.IO server for WebRTC signaling
- **`hooks/use-webrtc.ts`**: WebRTC connection logic
- **`app/page.tsx`**: Main video call interface

## Troubleshooting

### Common Issues

1. **"Socket Disconnected"**
   - Make sure the Socket.IO server is running on port 3001
   - Check browser console for connection errors

2. **"Failed to access camera/microphone"**
   - Allow camera/microphone permissions in your browser
   - Check if another app is using the camera

3. **No video/audio from peer**
   - Ensure both peers are in the same room
   - Check browser console for WebRTC errors
   - Try refreshing the page

4. **Connection issues**
   - Check firewall settings
   - Try different STUN servers if needed
   - Ensure both peers have stable internet connections

### Debug Mode

Open browser console to see detailed logs:
- 🔌 Socket.IO connection status
- 📤📥 Signaling messages
- 🔗 WebRTC connection states
- 🧊 ICE candidate exchange

## Production Deployment

For production, you'll need to:

1. **Deploy Socket.IO server** to a persistent hosting service (e.g., Heroku, DigitalOcean)
2. **Update client connection URL** in `hooks/use-webrtc.ts`
3. **Configure CORS** in `server.js` for your domain
4. **Add TURN servers** for better connectivity across different networks

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for your own applications!
