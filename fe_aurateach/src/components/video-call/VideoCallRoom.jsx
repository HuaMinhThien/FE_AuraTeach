// src/components/video-call/VideoCallRoom.jsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVideoCall } from "@/hooks/useVideoCall";
import styles from "./video-call.module.css";
import { authService } from "@/services/authService";

export default function VideoCallRoom({ roomId, userName, userRole, tutorPeerId }) {
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ Lấy user thật từ cookie
  useEffect(() => {
    const fetchUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      console.log("👤 [VideoCallRoom] Current user:", user);
    };
    fetchUser();
  }, []);

// ✅ Tạo peerId cho student (ngẫu nhiên + user_id để tránh trùng khi cùng user_id)
  const getRealPeerId = () => {
    if (userRole === 'tutor') {
      // LỖI 2: Tutor KHÔNG truyền peerId — provider tự dùng `tutor_${roomId}`
      // để student luôn gọi đúng peer
      return null;
    }
    // Student dùng student_ + user_id + random để tránh trùng peer id
    const uid = currentUser?.user_id || currentUser?.id || 'unknown';
    return `student_${Date.now()}_${uid}`;
  };

  // ✅ Tạo tutorPeerId thật (luôn là tutor_roomId)
  const getRealTutorPeerId = () => {
    return `tutor_${roomId}`;
  };

  const {
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
  } = useVideoCall(roomId, {
    userName: userName || currentUser?.full_name || 'Người dùng',
    userRole,
    tutorPeerId: getRealTutorPeerId(),
    autoJoin: true,
    // ✅ Thêm peerId thật
    peerId: getRealPeerId(),
  });

  // Xử lý khi rời phòng
  const handleLeaveRoom = async () => {
    if (window.confirm("Bạn có chắc muốn rời phòng học?")) {
      await leaveRoom();
      router.push("/");
    }
  };

  // Xử lý gửi tin nhắn
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  // Kiểm tra nếu đang loading
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang kết nối phòng học...</p>
      </div>
    );
  }

  // Kiểm tra nếu có lỗi
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <span className={styles.errorIcon}>❌</span>
        <p className={styles.errorText}>{error}</p>
        <button onClick={() => router.back()} className={styles.errorBtn}>
          Quay lại
        </button>
      </div>
    );
  }

  // Danh sách tất cả video streams (local + remote)
  const allStreams = [
    { peerId: myPeerId, stream: localStream, name: userName, role: userRole, isLocal: true },
    ...Object.entries(remoteStreams).map(([peerId, stream]) => {
      const participant = participants.find(p => p.peerId === peerId);
      return {
        peerId,
        stream,
        name: participant?.userName || "Học viên",
        role: participant?.role || "student",
        isLocal: false,
      };
    }),
  ];

  const hasRemoteStreams = Object.keys(remoteStreams).length > 0;
  const isTutorPresent = participants.some((p) => p.role === "tutor");
  const shouldRunTimer = userRole === "tutor" ? isConnected : (isConnected && isTutorPresent);

  return (
    <div className={styles.videoRoom}>
      {/* ===== VIDEO GRID ===== */}
      <div className={`${styles.videoGrid} ${hasRemoteStreams ? styles.multi : ""}`}>
        {allStreams.map(({ peerId, stream, name, role, isLocal }) => (
          <div key={peerId} className={styles.videoWrapper}>
            {stream ? (
              <video
                ref={(el) => {
                  if (el && stream) {
                    el.srcObject = stream;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                muted={isLocal}
                playsInline
              />
            ) : (
              <div className={styles.videoFallback}>
                <span>{isLocal ? "📸" : "👤"}</span>
                <span className={styles.name}>{name || "Đang kết nối..."}</span>
              </div>
            )}
            <div className={styles.videoLabel}>
              <span>{isLocal ? "📹 Bạn" : name || "Học viên"}</span>
              <span className={styles.role}>{role === "tutor" ? "👨‍🏫" : "👨‍🎓"}</span>
              {isLocal && (
                <span className={styles.micStatus}>
                  {isMicOn ? "🎤" : "🔇"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ===== PARTICIPANT LIST ===== */}
      <div className={styles.participantList}>
        <span>👥 {participants.length} người tham gia</span>
        {participants.map((p, i) => (
          <span key={i} className={styles.participantBadge}>
            {p.role === "tutor" ? "👨‍🏫" : "👨‍🎓"} {p.userName}
            {p.peerId === myPeerId && " (Bạn)"}
          </span>
        ))}
      </div>

      {/* ===== CONTROLS BAR ===== */}
      <div className={styles.controlsBar}>
        {/* Mic */}
        <button
          className={`${styles.controlBtn} ${isMicOn ? styles.active : styles.micOff}`}
          onClick={toggleMic}
          title={isMicOn ? "Tắt mic" : "Bật mic"}
        >
          {isMicOn ? "🎤" : "🔇"}
        </button>

        {/* Camera */}
        <button
          className={`${styles.controlBtn} ${isCameraOn ? styles.active : styles.cameraOff}`}
          onClick={toggleCamera}
          title={isCameraOn ? "Tắt camera" : "Bật camera"}
        >
          {isCameraOn ? "📹" : "🚫"}
        </button>

        {/* Screen Share */}
        <button
          className={`${styles.controlBtn} ${isScreenSharing ? styles.active : ""}`}
          onClick={toggleScreenShare}
          title={isScreenSharing ? "Dừng chia sẻ" : "Chia sẻ màn hình"}
        >
          {isScreenSharing ? "🖥️" : "📺"}
        </button>

        {/* Chat */}
        <button
          className={`${styles.controlBtn} ${isChatOpen ? styles.active : ""}`}
          onClick={() => setIsChatOpen(!isChatOpen)}
          title="Chat"
        >
          💬
          {messages.length > 0 && (
            <span className={styles.chatBadge}>{messages.length}</span>
          )}
        </button>

        {/* Participants */}
        <button
          className={`${styles.controlBtn} ${showParticipants ? styles.active : ""}`}
          onClick={() => setShowParticipants(!showParticipants)}
          title="Danh sách"
        >
          👥 {participants.length}
        </button>

        {/* Timer */}
        <div className={styles.timer}>
          <RoomTimer isRunning={shouldRunTimer} />
        </div>

        {/* End Call */}
        <button
          className={`${styles.controlBtn} ${styles.endCall}`}
          onClick={handleLeaveRoom}
          title="Kết thúc"
        >
          ❌
        </button>
      </div>

      {/* ===== CHAT BOX ===== */}
      <div className={`${styles.chatBox} ${isChatOpen ? styles.open : ""}`}>
        <div className={styles.chatHeader}>
          <h3>💬 Chat</h3>
          <button className={styles.chatClose} onClick={() => setIsChatOpen(false)}>
            ✕
          </button>
        </div>

        <div className={styles.chatMessages}>
          {messages.length === 0 ? (
            <div className={styles.chatEmpty}>
              <span>💬</span>
              <p>Chưa có tin nhắn nào</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`${styles.chatMessage} ${
                  msg.senderId === myPeerId ? styles.own : styles.other
                }`}
              >
                <div className={styles.sender}>
                  {msg.senderName || "Người dùng"}
                  {msg.senderId === myPeerId && " (Bạn)"}
                </div>
                <div>{msg.content}</div>
                <div className={styles.time}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className={styles.chatInput} onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
          />
          <button type="submit">Gửi</button>
        </form>
      </div>
    </div>
  );
}

// ===== ROOM TIMER COMPONENT =====
function RoomTimer({ isRunning }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return <span className={styles.timerText}>⏱️ {formatTime(seconds)}</span>;
}