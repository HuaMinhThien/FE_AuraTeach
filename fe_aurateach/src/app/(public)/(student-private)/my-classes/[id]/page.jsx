"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import authService from "@/services/authService";
import styles from "./ClassDetail.module.css";

const API_BASE = "http://localhost:3007";

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id;

  const [user, setUser] = useState(null);
  const [course, setCourse] = useState(null);
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
        await fetchCourseDetail(courseId);
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

  const fetchCourseDetail = async (id) => {
    try {
      console.log(`📡 Fetching course detail: ${id}`);
      
      const courseRes = await fetch(`${API_BASE}/courses?course_id=${id}`);
      const courses = await courseRes.json();
      const courseData = courses[0];
      
      if (!courseData) {
        setError("Không tìm thấy lớp học");
        return;
      }

      // Lấy thông tin tutor
      let tutorName = "Chưa có thông tin";
      if (courseData.tutor_id) {
        const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${courseData.tutor_id}`);
        const tutors = await tutorRes.json();
        const tutor = tutors[0];
        if (tutor) {
          const userRes = await fetch(`${API_BASE}/users?user_id=${tutor.user_id}`);
          const users = await userRes.json();
          const tutorUser = users[0];
          tutorName = tutorUser?.full_name || "Gia sư";
        }
      }

      // Lấy booking status
      let bookingStatus = "confirmed";
      const bookingsRes = await fetch(`${API_BASE}/bookings?course_id=${id}`);
      const bookings = await bookingsRes.json();
      const booking = bookings.find(b => b.student_id === user?.user_id);
      if (booking) {
        bookingStatus = booking.status;
      }

      setCourse({
        ...courseData,
        tutor_name: tutorName,
        booking_status: bookingStatus,
        booking_id: booking?.booking_id,
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
                  {course.booking_status === "active" ? "✅ Đang học" : "✅ Đã xác nhận"}
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
                  <label>⏰ Thời gian</label>
                  <p>{course.time_slot || "Chưa cập nhật"}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>📚 Lịch học</label>
                  <p>{course.schedule_days?.join(", ") || "Chưa cập nhật"}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>💰 Học phí/Buổi</label>
                  <p>{formatCurrency(course.price_per_session)}</p>
                </div>
                <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                  <label>📝 Mô tả</label>
                  <p>{course.description || "Không có mô tả"}</p>
                </div>
                <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                  <label>🔗 Link phòng học</label>
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

              <div className={styles.actions}>
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