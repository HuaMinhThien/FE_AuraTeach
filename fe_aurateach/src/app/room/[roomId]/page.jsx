// src/app/room/[roomId]/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import VideoCallRoom from "@/components/video-call/VideoCallRoom";
import styles from "./page.module.css";
import authService from "@/services/authService";

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId;

  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("student");
  const [userName, setUserName] = useState("Học viên");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lấy thông tin từ URL query params
  const [tutorPeerId, setTutorPeerId] = useState(null);
  const [roleFromUrl, setRoleFromUrl] = useState("student");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    setTutorPeerId(query.get("tutor") || null);
    setRoleFromUrl(query.get("role") || "student");
  }, []);

  console.log("🔍 [Room] URL params:", { roomId, tutorPeerId, roleFromUrl });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        console.log("👤 [Room] Current user:", currentUser);

        if (currentUser) {
          setUser(currentUser);
          setUserName(currentUser.full_name || currentUser.name || "Người dùng");
          
          // ✅ QUAN TRỌNG: Xác định role dựa trên user thực tế
          let finalRole = currentUser.role || roleFromUrl;
          
          // Nếu user là tutor, luôn set role = tutor
          if (currentUser.role === "tutor") {
            finalRole = "tutor";
          }
          
          setUserRole(finalRole);
          
          console.log("✅ [Room] Final role:", finalRole);
          console.log("✅ [Room] Final tutorPeerId:", tutorPeerId);
          
          // ✅ Nếu là student mà không có tutorPeerId, tự động tạo từ roomId
          if (finalRole === "student" && !tutorPeerId) {
            const autoTutorPeerId = `tutor_${roomId}`;
            console.log("🔄 [Room] Auto-generate tutorPeerId:", autoTutorPeerId);
            // Lưu vào state hoặc truyền xuống component
            setError(null);
          }
        } else {
          setError("Vui lòng đăng nhập để tham gia phòng học");
        }
      } catch (error) {
        console.error("❌ [Room] Error fetching user:", error);
        setError("Không thể lấy thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [roleFromUrl, tutorPeerId, roomId]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải thông tin phòng học...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <span className={styles.errorIcon}>🔒</span>
        <p className={styles.errorText}>{error}</p>
        <a href="/login" className={styles.errorBtn}>
          Đăng nhập ngay
        </a>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className={styles.errorContainer}>
        <span className={styles.errorIcon}>❌</span>
        <p className={styles.errorText}>Không tìm thấy phòng học</p>
        <a href="/" className={styles.errorBtn}>
          Về trang chủ
        </a>
      </div>
    );
  }

  // ✅ Nếu là student và không có tutorPeerId, tự động tạo
  const effectiveTutorPeerId = tutorPeerId || (userRole === "student" ? `tutor_${roomId}` : null);

  console.log("🎯 [Room] Effective tutorPeerId:", effectiveTutorPeerId);

  return (
    <div className={styles.container}>
      <VideoCallRoom
        roomId={roomId}
        userName={userName}
        userRole={userRole}
        tutorPeerId={effectiveTutorPeerId}
      />
    </div>
  );
}