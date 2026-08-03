"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import { authService } from "@/services/authService";
import { courseService } from "@/services/courseService";
import { courseScheduleService } from "@/services/courseScheduleService";
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
      console.log(`📡 Fetching course detail: ${id}`);
      
      // 1. Lấy thông tin chi tiết khóa học kèm các quan hệ từ Backend
      const courseData = await courseService.getCourseDetail(id);
      
      if (!courseData) {
        setError("Không tìm thấy lớp học");
        return;
      }

      // 2. Lấy danh sách các buổi học trực tiếp từ dữ liệu backend trả về (ưu tiên hàng đầu)
      let sessions = courseData.class_sessions || courseData.classSessions || [];

      // Dự phòng: Nếu API courseDetail chưa gom sẵn, mới gọi service phụ để lọc
      if (sessions.length === 0) {
        try {
          const allSessions = await courseScheduleService.getCourseSchedules();
          sessions = (Array.isArray(allSessions) ? allSessions : allSessions.data || [])
            .filter(session => String(session.course_id) === String(id));
        } catch (err) {
          console.warn("⚠️ Không thể tải danh sách buổi học phụ:", err);
        }
      }

      // Sắp xếp các buổi học theo thời gian tăng dần
      sessions.sort((a, b) => new Date(a.actual_date) - new Date(b.actual_date));
      setClassSessions(sessions);

      setCourse({
        ...courseData,
        tutor_name: courseData.tutor_name || "Gia sư",
        booking_status: courseData.booking_status || "confirmed",
      });
      
    } catch (error) {
      console.error("❌ Lỗi lấy chi tiết lớp học:", error);
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

  const handleJoinClass = (meetUrl) => {
    if (meetUrl) {
      window.open(meetUrl, "_blank");
    } else {
      alert("Lớp học này chưa có link tham gia!");
    }
  };

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
                  <p>{formatCurrency(course.hourly_rate)}</p>
                </div>
                <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                  <label>📝 Mô tả</label>
                  <p>{course.description || "Không có mô tả"}</p>
                </div>
                <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                  <label>🔗 Link phòng học cố định</label>
                  <p>
                    {course.permanent_room_url ? (
                      <a 
                        href={course.permanent_room_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.roomLink}
                      >
                        {course.permanent_room_url}
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
                {course.permanent_room_url && (
                  <button 
                    className={styles.joinBtn}
                    onClick={() => handleJoinClass(course.permanent_room_url)}
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