// src/services/video/video.config.js

const config = {
  // Công nghệ sử dụng: 'peerjs' | 'daily' | 'jitsi'
  provider: process.env.NEXT_PUBLIC_VIDEO_PROVIDER || 'peerjs',
  
  // Cấu hình PeerJS
  peerjs: {
    // Sử dụng STUN servers mặc định của Google
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  },
};

export default config;