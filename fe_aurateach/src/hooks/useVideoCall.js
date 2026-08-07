// src/hooks/useVideoCall.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { videoService } from '@/services/video';

export function useVideoCall(roomId, options = {}) {
  const {
    userName = 'Người dùng',
    userRole = 'student',
    tutorPeerId = null,
    peerId = null, // ✅ Thêm peerId
    autoJoin = false,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);

  const messagesEndRef = useRef(null);
  const joinAttemptRef = useRef(false);

  // ========== ĐĂNG KÝ CALLBACK ==========

  useEffect(() => {
    videoService.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    videoService.onParticipantJoined((participant) => {
      setParticipants(prev => [...prev, participant]);
    });

    videoService.onParticipantLeft((peerId) => {
      setParticipants(prev => prev.filter(p => p.peerId !== peerId));
    });

    return () => {};
  }, []);

  // ========== AUTO JOIN ==========

  useEffect(() => {
    if (autoJoin && roomId && !joinAttemptRef.current) {
      joinAttemptRef.current = true;
      joinRoom();
    }
  }, [autoJoin, roomId]);

  // ========== JOIN ROOM ==========

  const joinRoom = useCallback(async () => {
    if (!roomId) {
      setError('Không có mã phòng học');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📡 [useVideoCall] Joining room:', { roomId, userName, userRole, tutorPeerId, peerId });

      let result;

      if (userRole === 'tutor') {
        // ✅ Tutor dùng peerId thật hoặc tạo từ roomId
        const effectivePeerId = peerId || `tutor_${roomId}`;
        console.log('🏗️ [useVideoCall] Creating room as tutor with peerId:', effectivePeerId);
        
        result = await videoService.createRoom({
          roomId,
          userName,
          peerId: effectivePeerId, // ✅ Truyền peerId vào
        });
      } else {
        if (!tutorPeerId) {
          setError('Không tìm thấy ID của gia sư. Vui lòng kiểm tra link hoặc liên hệ gia sư.');
          setIsLoading(false);
          return;
        }
        
        // ✅ Student dùng peerId thật hoặc tạo ngẫu nhiên
        const effectivePeerId = peerId || `student_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        console.log('🚪 [useVideoCall] Joining room as student with peerId:', effectivePeerId);
        
        result = await videoService.joinRoom({
          roomId,
          userName,
          tutorPeerId,
          peerId: effectivePeerId, // ✅ Truyền peerId vào
        });
      }

      setIsConnected(true);
      setMyPeerId(videoService.getMyPeerId());
      setParticipants(videoService.getParticipants());
      setIsMicOn(videoService.isMicOn());
      setIsCameraOn(videoService.isCameraOn());

      console.log('✅ [useVideoCall] Room joined:', result);

    } catch (error) {
      console.error('❌ [useVideoCall] Join error:', error);
      
      let errorMessage = 'Không thể tham gia phòng học';
      if (error.message) {
        if (error.message.includes('Could not connect to peer')) {
          errorMessage = 'Không thể kết nối đến gia sư. Vui lòng đảm bảo gia sư đã vào phòng trước.';
        } else if (error.message.includes('No local stream')) {
          errorMessage = 'Không thể truy cập camera/microphone. Vui lòng kiểm tra quyền truy cập.';
        } else {
          errorMessage = error.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, userName, userRole, tutorPeerId, peerId]);

  // ========== LEAVE ROOM ==========

  const leaveRoom = useCallback(async () => {
    try {
      await videoService.leaveRoom();
      setIsConnected(false);
      setParticipants([]);
      setMessages([]);
      joinAttemptRef.current = false;
      console.log('👋 [useVideoCall] Left room');
    } catch (error) {
      console.error('❌ [useVideoCall] Leave error:', error);
    }
  }, []);

  // ========== TOGGLE MIC ==========

  const toggleMic = useCallback(() => {
    videoService.toggleMic();
    setIsMicOn(prev => !prev);
  }, []);

  // ========== TOGGLE CAMERA ==========

  const toggleCamera = useCallback(() => {
    videoService.toggleCamera();
    setIsCameraOn(prev => !prev);
  }, []);

  // ========== SHARE SCREEN ==========

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        await videoService.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await videoService.shareScreen();
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('❌ [useVideoCall] Screen share error:', error);
      setError('Không thể chia sẻ màn hình');
    }
  }, [isScreenSharing]);

  // ========== SEND MESSAGE ==========

  const sendMessage = useCallback((content) => {
    if (!content.trim()) return;

    const sender = {
      id: myPeerId,
      name: userName,
      role: userRole,
    };

    videoService.sendMessage(content, sender);
  }, [myPeerId, userName, userRole]);

  // ========== AUTO SCROLL CHAT ==========

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ========== GETTERS ==========

  const localStream = videoService.getLocalStream?.() || null;
  const remoteStreams = videoService.getRemoteStreams?.() || {};

  return {
    isConnected,
    participants,
    messages,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    isLoading,
    error,
    myPeerId,
    localStream,
    remoteStreams,
    messagesEndRef,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendMessage,
  };
}