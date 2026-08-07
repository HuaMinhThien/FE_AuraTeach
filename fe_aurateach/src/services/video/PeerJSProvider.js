// src/services/video/PeerJSProvider.js

import { VideoProvider } from './VideoProvider';
import Peer from 'peerjs'; // ✅ LỖI 1: Static import thay vì dynamic import → hết race condition

export class PeerJSProvider extends VideoProvider {
  constructor() {
    super();
    this.peer = null;
    this.connections = []; // Media calls
    this.dataConnections = []; // ✅ Data connections cho chat
    this.localStream = null;
    this.remoteStreams = {};
    this.participants = [];
    this.connected = false;
    this.micOn = true;
    this.cameraOn = true;
    this.isScreenSharing = false;
    this.myPeerId = null;
    this.roomId = null;
    this.userName = '';
    this.userRole = '';
    this.tutorPeerId = null;
    this.onMessageCallback = null;
    this.onParticipantJoinedCallback = null;
    this.onParticipantLeftCallback = null;
    this.tutorConnectInterval = null;
  }

  // ========== KHỞI TẠO ==========

  async initialize(options) {
    const { peerId, roomId, userName, userRole } = options;
    
    this.roomId = roomId;
    this.userName = userName;
    this.userRole = userRole;

    return new Promise((resolve, reject) => {
      this.peer = new Peer(peerId, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ]
        }
      });

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        console.log('📡 [PeerJS] Connected with ID:', id);
        this.connected = true;
        resolve({ peerId: id });
      });

      this.peer.on('error', (error) => {
        console.error('❌ [PeerJS] Error:', error);
        // Peer ID bị trùng (đăng trùng) — thử friendly id
        if (error.type === 'unavailable-id') {
          console.warn('⚠️ [PeerJS] Peer ID unavailable, retrying with random ID...');
          this.peer.destroy();
          this.peer = new Peer({
            host: '0.peerjs.com',
            port: 443,
            path: '/',
            secure: true,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
              ]
            }
          });
          this.peer.on('open', (id) => {
            this.myPeerId = id;
            console.log('📡 [PeerJS] Reconnected with ID:', id);
            this.connected = true;
            resolve({ peerId: id });
          });
          this.peer.on('error', (err2) => reject(err2));
        } else {
          reject(error);
        }
      });

      this.peer.on('call', (call) => {
        console.log('📞 [PeerJS] Incoming call from:', call.peer);
        this._handleIncomingCall(call);
      });

      this.peer.on('connection', (conn) => {
        console.log('🔗 [PeerJS] New data connection:', conn.peer);
        this._handleConnection(conn);
      });
    });
  }

  // ========== TẠO PHÒNG (TUTOR) ==========

  async createRoom(options) {
    const { roomId, userName, peerId } = options;
    this.userName = userName;
    this.userRole = 'tutor';
    this.roomId = roomId;

    // ✅ LỖI 2: Tutor luôn dùng `tutor_${roomId}` để student có thể gọi đúng
    const tutorPeerId = `tutor_${roomId}`;

    await this.initialize({ 
      peerId: tutorPeerId, 
      roomId, 
      userName, 
      userRole: 'tutor' 
    });

    await this._getLocalStream();

    this.participants = [
      {
        peerId: this.myPeerId,
        userName: this.userName,
        role: 'tutor',
        isOnline: true,
      }
    ];

    console.log('✅ [PeerJS] Room created by tutor:', {
      roomId: this.roomId,
      peerId: this.myPeerId,
    });

    return {
      roomId: this.roomId,
      peerId: this.myPeerId,
      participants: this.participants,
    };
  }

  // ========== THAM GIA PHÒNG (STUDENT) ==========

  async joinRoom(options) {
    const { roomId, userName, tutorPeerId, peerId } = options;
    this.userName = userName;
    this.userRole = 'student';
    this.roomId = roomId;
    // ✅ LỖI 2: Lưu tutorPeerId thật để gọi đúng peer
    this.tutorPeerId = tutorPeerId || `tutor_${roomId}`;

    const studentPeerId = peerId || `student_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    console.log('📡 [PeerJS] Student joining with ID:', studentPeerId);
    console.log('📡 [PeerJS] Tutor peer ID:', this.tutorPeerId);

    await this.initialize({ 
      peerId: studentPeerId, 
      roomId, 
      userName, 
      userRole: 'student' 
    });

    await this._getLocalStream();
    
    // Mở data connection ngay (nếu tutor chưa online sẽ tự thử lại nền)
    this._openDataConnection(this.tutorPeerId);

    // Cho phép học viên vào phòng ngay cả khi gia sư chưa online.
    // Khi gia sư vào, vòng lặp sẽ tự kết nối media stream.
    this._startTutorReconnectLoop(this.tutorPeerId);

    this.participants = [
      {
        peerId: this.myPeerId,
        userName: this.userName,
        role: 'student',
        isOnline: true,
      }
    ];

    console.log('✅ [PeerJS] Student joined room:', {
      roomId: this.roomId,
      peerId: this.myPeerId,
    });

    return {
      roomId: this.roomId,
      peerId: this.myPeerId,
      participants: this.participants,
    };
  }

  // ========== PHƯƠNG THỨC NỘI BỘ ==========

  _getLocalStream() {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        this.localStream = stream;
        this.micOn = true;
        this.cameraOn = true;
        resolve(stream);
      })
      .catch((error) => {
        console.error('❌ [PeerJS] Cannot access media devices:', error);
        reject(error);
      });
    });
  }

  // ✅ LỖI 4: Gọi peer với auto-retry nếu peer chưa online
  _callPeerWithRetry(peerId, maxAttempts = 15) {
    return new Promise((resolve, reject) => {
      let attempt = 0;

      const tryCall = () => {
        attempt++;
        if (!this.localStream) {
          reject(new Error('No local stream available'));
          return;
        }

        console.log(`📞 [PeerJS] Calling peer (attempt ${attempt}/${maxAttempts}):`, peerId);

        let call;
        try {
          call = this.peer.call(peerId, this.localStream);
        } catch (err) {
          console.error('❌ [PeerJS] peer.call threw:', err);
          call = null;
        }
        
        if (!call) {
          if (attempt < maxAttempts) {
            console.log(`⚠️ [PeerJS] Peer not available yet, retrying in 2s...`);
            setTimeout(tryCall, 2000);
          } else {
            reject(new Error(`Could not connect to peer ${peerId}`));
          }
          return;
        }

        let settled = false;

        call.on('stream', (remoteStream) => {
          if (settled) return;
          settled = true;
          console.log('📡 [PeerJS] Remote stream received from:', peerId);
          this.remoteStreams[peerId] = remoteStream;
          
          const participant = {
            peerId: peerId,
            userName: 'Gia sư',
            role: 'tutor',
            isOnline: true,
          };
          
          // Tránh thêm trùng
          if (!this.participants.find(p => p.peerId === peerId)) {
            this.participants.push(participant);
          }
          
          if (this.onParticipantJoinedCallback) {
            this.onParticipantJoinedCallback(participant);
          }
          resolve(call);
        });

        call.on('close', () => {
          console.log('📞 [PeerJS] Call closed with:', peerId);
          this._removeParticipant(peerId);
        });

        call.on('error', (err) => {
          console.error('❌ [PeerJS] Call error:', err);
          if (!settled && attempt < maxAttempts) {
            console.log(`⚠️ [PeerJS] Call error, retrying in 2s...`);
            try {
              call.close();
            } catch (e) {}
            setTimeout(tryCall, 2000);
          } else if (!settled) {
            reject(err);
          }
        });

        this.connections.push(call);
      };

      tryCall();
    });
  }

  // ✅ LỖI 3: Mở data connection cho chat
  _openDataConnection(peerId) {
    try {
      const conn = this.peer.connect(peerId, { reliable: true });
      this._setupDataConnection(conn);
      console.log('💬 [PeerJS] Data connection opened to:', peerId);
    } catch (error) {
      console.error('❌ [PeerJS] Cannot open data connection:', error);
    }
  }

  _startTutorReconnectLoop(peerId) {
    if (this.tutorConnectInterval) {
      clearInterval(this.tutorConnectInterval);
      this.tutorConnectInterval = null;
    }

    const tryConnect = async () => {
      if (!this.peer) return;

      const alreadyConnected = this.connections.some(
        (conn) => conn?.peer === peerId
      );
      if (alreadyConnected || this.remoteStreams[peerId]) {
        clearInterval(this.tutorConnectInterval);
        this.tutorConnectInterval = null;
        return;
      }

      this._openDataConnection(peerId);

      try {
        await this._callPeerWithRetry(peerId, 1);
        clearInterval(this.tutorConnectInterval);
        this.tutorConnectInterval = null;
      } catch (error) {
        console.log('⏳ [PeerJS] Tutor chưa online, tiếp tục chờ kết nối...');
      }
    };

    // Thử ngay lần đầu để giảm độ trễ.
    tryConnect();
    this.tutorConnectInterval = setInterval(tryConnect, 5000);
  }

  _setupDataConnection(conn) {
    conn.on('open', () => {
      console.log('💬 [PeerJS] Data connection open with:', conn.peer);
      // Gửi thông tin người tham gia qua data connection
      conn.send({
        type: 'participant-info',
        senderId: this.myPeerId,
        senderName: this.userName,
        role: this.userRole,
      });
    });

    conn.on('data', (data) => {
      console.log('💬 [PeerJS] Received data:', data);
      
      if (data.type === 'chat' && this.onMessageCallback) {
        this.onMessageCallback({
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.content,
          timestamp: data.timestamp,
        });
      } else if (data.type === 'participant-info' && this.onParticipantJoinedCallback) {
        const participant = {
          peerId: conn.peer,
          userName: data.senderName,
          role: data.role,
          isOnline: true,
        };
        if (!this.participants.find(p => p.peerId === participant.peerId)) {
          this.participants.push(participant);
          this.onParticipantJoinedCallback(participant);
        }
      }
    });

    conn.on('close', () => {
      console.log('💬 [PeerJS] Data connection closed with:', conn.peer);
      this._removeParticipant(conn.peer);
    });

    conn.on('error', (err) => {
      console.error('❌ [PeerJS] Data connection error:', err);
    });

    this.dataConnections.push(conn);
  }

  _callPeer(peerId) {
    return this._callPeerWithRetry(peerId);
  }

  _handleIncomingCall(call) {
    if (!this.localStream) {
      console.warn('⚠️ [PeerJS] No local stream, answering without stream');
      call.answer();
      return;
    }

    console.log('📞 [PeerJS] Answering incoming call from:', call.peer);
    call.answer(this.localStream);

    call.on('stream', (remoteStream) => {
      console.log('📡 [PeerJS] Remote stream from:', call.peer);
      this.remoteStreams[call.peer] = remoteStream;
      
      const participant = {
        peerId: call.peer,
        userName: 'Học viên',
        role: 'student',
        isOnline: true,
      };
      
      if (!this.participants.find(p => p.peerId === participant.peerId)) {
        this.participants.push(participant);
      }
      
      if (this.onParticipantJoinedCallback) {
        this.onParticipantJoinedCallback(participant);
      }
    });

    call.on('close', () => {
      console.log('📞 [PeerJS] Call closed from:', call.peer);
      this._removeParticipant(call.peer);
    });

    this.connections.push(call);
  }

  _handleConnection(conn) {
    this._setupDataConnection(conn);
  }

  _removeParticipant(peerId) {
    this.participants = this.participants.filter(p => p.peerId !== peerId);
    delete this.remoteStreams[peerId];
    
    if (this.onParticipantLeftCallback) {
      this.onParticipantLeftCallback(peerId);
    }
  }

  // ========== PHƯƠNG THỨC CÔNG KHAI ==========

  toggleMic() {
    if (!this.localStream) return;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
        this.micOn = audioTrack.enabled;
        console.log('🎤 [PeerJS] Mic:', this.micOn ? 'ON' : 'OFF');
    }
  }

  toggleCamera() {
    if (!this.localStream) return;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.cameraOn = videoTrack.enabled;
      console.log('📹 [PeerJS] Camera:', this.cameraOn ? 'ON' : 'OFF');
    }
  }

  async shareScreen() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      this.isScreenSharing = true;
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = this.localStream.getVideoTracks()[0];
      if (sender) this.localStream.removeTrack(sender);
      this.localStream.addTrack(videoTrack);

      this.connections.forEach(conn => {
        if (conn.peerConnection) {
          const senders = conn.peerConnection.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(videoTrack);
          }
        }
      });

      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      console.log('📺 [PeerJS] Screen sharing started');
    } catch (error) {
      console.error('❌ [PeerJS] Screen share error:', error);
      throw error;
    }
  }

  async stopScreenShare() {
    if (!this.isScreenSharing) return;
    
    this.isScreenSharing = false;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    
    const videoTrack = stream.getVideoTracks()[0];
    const sender = this.localStream.getVideoTracks()[0];
    if (sender) this.localStream.removeTrack(sender);
    this.localStream.addTrack(videoTrack);
    
    this.connections.forEach(conn => {
      if (conn.peerConnection) {
        const senders = conn.peerConnection.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        }
      }
    });
    
    console.log('📺 [PeerJS] Screen sharing stopped');
  }

  sendMessage(message, sender) {
    const data = {
      type: 'chat',
      senderId: this.myPeerId,
      senderName: sender?.name || this.userName,
      content: message,
      timestamp: new Date().toISOString(),
    };

    // Gửi qua data connections (chat)
    this.dataConnections.forEach(conn => {
      if (conn.open && conn.send) {
        conn.send(data);
      }
    });

    // Fallback: cũng gửi qua media connections nếu data connection không có
    if (this.dataConnections.length === 0) {
      this.connections.forEach(conn => {
        if (conn.send) {
          conn.send(data);
        }
      });
    }
  }

  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  onParticipantJoined(callback) {
    this.onParticipantJoinedCallback = callback;
  }

  onParticipantLeft(callback) {
    this.onParticipantLeftCallback = callback;
  }

  async leaveRoom() {
    if (this.tutorConnectInterval) {
      clearInterval(this.tutorConnectInterval);
      this.tutorConnectInterval = null;
    }

    this.connections.forEach(conn => {
      if (conn.close) conn.close();
    });
    this.connections = [];

    this.dataConnections.forEach(conn => {
      if (conn.close) conn.close();
    });
    this.dataConnections = [];

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.connected = false;
    this.participants = [];
    this.remoteStreams = {};
    
    console.log('👋 [PeerJS] Left room');
  }

  destroy() {
    this.leaveRoom();
  }

  // ========== GETTERS ==========

  getParticipants() {
    return this.participants;
  }

  isConnected() {
    return this.connected;
  }

  getMyPeerId() {
    return this.myPeerId;
  }

  isMicOn() {
    return this.micOn;
  }

  isCameraOn() {
    return this.cameraOn;
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStreams() {
    return this.remoteStreams;
  }
}
