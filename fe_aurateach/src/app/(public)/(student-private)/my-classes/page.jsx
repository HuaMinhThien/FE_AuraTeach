"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import ClassCalendar from "./_components/ClassCalendar"; 
import { authService } from "@/services/authService";
import { courseScheduleService } from "@/services/courseScheduleService"; // 👈 Sử dụng đúng service của bạn ở đây
import styles from "./page.module.css";

export default function MyClassesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        
        // 1. Lấy thông tin user hiện tại
        const rawUserResponse = await authService.getCurrentUser();
        const baseData = rawUserResponse?.data || rawUserResponse;
        const currentUser = baseData?.user || baseData;

        if (!currentUser) {
          router.push("/login");
          return;
        }

        setUser(currentUser);

        // 2. Lấy định danh học viên (student_id hoặc user_id)
        const userId = currentUser.student_id || currentUser.user_id || currentUser.id;
        
        if (!userId) {
          setError("Không tìm thấy ID học viên");
          setLoading(false);
          return;
        }

        // 3. Gọi API lấy danh sách buổi học thực tế từ Backend qua courseScheduleService
        await fetchStudentSessions(userId);
        
      } catch (err) {
        console.error("❌ Lỗi tải trang:", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

  const fetchStudentSessions = async (userId) => {
    try {
      console.log(`📡 Fetching actual session schedule for student: ${userId}`);
      
      // 👇 Gọi qua courseScheduleService
      const response = await courseScheduleService.getStudentScheduleSessions(userId);
      console.log("📥 Dữ liệu các buổi học trả về từ API:", response);

      let sessionsList = [];
      const resData = response.data || response;
      if (Array.isArray(resData)) {
        sessionsList = resData;
      } else if (resData && Array.isArray(resData.data)) {
        sessionsList = resData.data;
      }

      setSessions(sessionsList);
      
    } catch (err) {
      console.error("❌ Lỗi lấy lịch học:", err);
      setError("Không thể tải danh sách lịch học");
    }
  };

  const handleDateClick = (sessionItem) => {
    const courseId = sessionItem.course_id;
    if (courseId) {
      router.push(`/my-classes/${courseId}`);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Đang tải lịch học...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>⚠️ {error}</p>
          <button onClick={() => window.location.reload()} className={styles.retryBtn}>
            Thử lại
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
              <h2>Lịch học của tôi</h2>
              <p className={styles.subtitle}>
                Xem chi tiết các buổi học trong lịch trình của bạn
              </p>
              <div className={styles.statsBadge}>
                <span className={styles.totalClasses}>
                  📖 {sessions.length} buổi học đã lên lịch
                </span>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}></span>
                <h3>Chưa có lịch học</h3>
                <p>Bạn chưa có buổi học nào được kích hoạt. Hãy đăng ký lớp học ngay!</p>
                <a href="/classList" className={styles.findClassBtn}>
                  Tìm lớp học ngay
                </a>
              </div>
            ) : (
              <ClassCalendar
                courses={sessions} 
                onDateClick={handleDateClick}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}