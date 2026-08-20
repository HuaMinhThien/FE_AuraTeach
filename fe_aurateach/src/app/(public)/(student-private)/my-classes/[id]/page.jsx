"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import { authService } from "@/services/authService";
import { courseService } from "@/services/courseService";
import { courseScheduleService } from "@/services/courseScheduleService";
import { getClassroomRoomPath } from "@/utils/roomUtils";
import styles from "./ClassDetail.module.css";

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id;

  const [user, setUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [classSessions, setClassSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const currentUser = await authService.getCurrentUser();
        
        if (!currentUser) {
          router.push("/login");
          return;
        }

        setUser(currentUser);
        await fetchCourseDetail(courseId, currentUser.user_id);
      } catch (error) {
        console.error("❌ Lỗi tải trang:", error);
        setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      initPage();
    }
  }, [router, courseId]);

  const fetchCourseDetail = async (id, currentUserId) => {
    try {
      console.log(`📡 [DEBUG] Bắt đầu fetch chi tiết khóa học ID: ${id}`);
      
      const courseData = await courseService.getCourseDetail(id);
      console.log("📥 [DEBUG] Dữ liệu courseData gốc từ API:", courseData);

      if (!courseData) {
        console.warn("⚠️ [DEBUG] Không tìm thấy courseData!");
        setError("Không tìm thấy lớp học");
        return;
      }

      // --- KIỂM TRA QUAN HỆ TUTOR & USERS ---
      console.log("🔍 [DEBUG] Kiểm tra trường tutor_id:", courseData.tutor_id);
      console.log("🔍 [DEBUG] Kiểm tra object tutor:", courseData.tutor);
      console.log("🔍 [DEBUG] Kiểm tra bảng users bên trong tutor:", courseData.tutor?.user || courseData.tutor?.users);

      // Bóc tách tên gia sư linh hoạt từ nhiều tầng dữ liệu quan hệ
      const tutorName = 
        courseData.tutor?.user?.full_name || 
        courseData.tutor?.users?.full_name || 
        courseData.tutor?.full_name || 
        courseData.tutor_name || 
        "Gia sư";

      console.log("✅ [DEBUG] Tên gia sư sau khi bóc tách:", tutorName);

      // Lấy danh sách buổi học từ course_schedules
      let sessions = courseData.class_sessions || courseData.classSessions || [];
      console.log("📋 [DEBUG] Danh sách sessions:", sessions);

      if (sessions.length === 0) {
        try {
          const allSessions = await courseScheduleService.getCourseSchedules();
          sessions = (Array.isArray(allSessions) ? allSessions : allSessions.data || [])
            .filter(session => String(session.course_id) === String(id));
          console.log("📋 [DEBUG] Danh sách sessions lọc từ service phụ:", sessions);
        } catch (err) {
          console.warn("⚠️ [DEBUG] Lỗi tải danh sách buổi học phụ:", err);
        }
      }

      sessions.sort((a, b) => new Date(a.start_time || a.actual_date) - new Date(b.start_time || b.actual_date));
      setClassSessions(sessions);

      const primarySchedule = (courseData.schedules && courseData.schedules[0]) || sessions[0] || {};
      console.log("📅 [DEBUG] Lịch học chính (primarySchedule):", primarySchedule);

      setCourse({
        ...courseData,
        tutor_name: tutorName,
        booking_status: courseData.booking_status || "confirmed",
        // Lấy đúng ngày bắt đầu/kết thúc từ bảng course_schedules (thường API trả về qua quan hệ schedules)
        start_date: primarySchedule.start_time || primarySchedule.actual_date || courseData.start_date,
        end_date: primarySchedule.end_time || courseData.end_date,
        // Lấy đúng khung giờ (ví dụ: "10:00-12:00")
        time_slot: primarySchedule.time_slot || courseData.time_slot,
        schedule_days: primarySchedule.day_of_week ? [primarySchedule.day_of_week] : courseData.schedule_days,
        permanent_room_url: primarySchedule.meeting_platform || courseData.permanent_room_url,
      });
      
    } catch (error) {
      console.error("❌ [DEBUG] Lỗi nghiêm trọng tại fetchCourseDetail:", error);
      setError("Không thể tải chi tiết lớp học");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (price) => {
    if (!price) return "Liên hệ";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleJoinClass = () => {
    if (course) {
      window.open(getClassroomRoomPath(course, "student"), "_blank");
    } else {
      alert("Lớp học này chưa có link tham gia!");
    }
  };

  const roomPath = course ? getClassroomRoomPath(course, "student") : "";

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Đang tải chi tiết lớp học...</p>
        </div>
      </>
    );
  }

  if (error || !course) {
    return (
      <>
        <Header />
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>⚠️ {error || "Không tìm thấy lớp học"}</p>
          <button onClick={() => router.push("/my-classes")} className={styles.backBtn}>
            Quay lại lịch học
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          <StudentSidebar />

          <div className={styles.content}>
            <div className={styles.header}>
              <button onClick={() => router.push("/my-classes")} className={styles.backBtn}>
                ← Quay lại
              </button>
              <h2>📖 Chi tiết lớp học</h2>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{course.title}</h3>
                <span className={`${styles.status} ${course.booking_status === "active" ? styles.statusActive : styles.statusConfirmed}`}>
                  {course.booking_status === "active" ? " Đang học" : " Đã xác nhận"}
                </span>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>👨‍🏫 Gia sư</label>
                  <p>{course.tutor_name}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>📅 Ngày bắt đầu</label>
                  <p>{formatDate(course.start_date)}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>📅 Ngày kết thúc</label>
                  <p>{formatDate(course.end_date)}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>⏰ Khung giờ</label>
                  <p>{course.time_slot || "Chưa cập nhật"}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>📚 Lịch học định kỳ</label>
                  <p>{Array.isArray(course.schedule_days) ? course.schedule_days.join(", ") : (course.schedule_days || "Chưa cập nhật")}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>💰 Học phí / buổi</label>
                  <p>{formatCurrency(course.price_per_session)}</p>
                </div>
                <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                  <label>📝 Mô tả</label>
                  <p>{course.description || "Không có mô tả"}</p>
                </div>
                <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                  <label>🔗 Link phòng học cố định</label>
                  <p>
                    {roomPath  ? (
                      <a 
                        href={roomPath } 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.roomLink}
                      >
                        {roomPath }
                      </a>
                    ) : (
                      "Chưa có link"
                    )}
                  </p>
                </div>
              </div>

              {/* Danh sách các buổi học cụ thể (Class Sessions) */}
              <div className={styles.sessionsSection} style={{ marginTop: "24px" }}>
                <h4 style={{ marginBottom: "12px", fontSize: "1.1rem", color: "#1f2937" }}>
                  📋 Danh sách các buổi học ({classSessions.length})
                </h4>
                {classSessions.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {classSessions.map((session, index) => (
                      <div 
                        key={session.session_id || index}
                        style={{
                          padding: "12px 16px",
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "8px"
                        }}
                      >
                        <div>
                          <strong>Buổi {index + 1}: {session.lesson_title || "Nội dung đang cập nhật"}</strong>
                          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
                            📅 Ngày: {formatDate(session.actual_date)} | ⏰ Giờ: {session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)}
                          </div>
                        </div>
                        <div>
                          <span style={{ 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            fontSize: "0.75rem", 
                            fontWeight: "600",
                            background: session.status === "completed" ? "#d1fae5" : "#dbeafe",
                            color: session.status === "completed" ? "#065f46" : "#1e40af"
                          }}>
                            {session.status === "completed" ? "Đã học" : "Sắp tới"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>Chưa có thông tin chi tiết về các buổi học.</p>
                )}
              </div>

              <div className={styles.actions} style={{ marginTop: "24px" }}>
                {roomPath  && (
                  <button 
                    className={styles.joinBtn}
                    onClick={handleJoinClass}
                  >
                    🚀 Tham gia lớp học
                  </button>
                )}
                <button 
                  className={styles.backToCalendarBtn}
                  onClick={() => router.push("/my-classes")}
                >
                  📅 Quay lại lịch học
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}