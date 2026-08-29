"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import ClassCalendar from "./_components/ClassCalendar";
import authService from "@/services/authService";
import styles from "./page.module.css";

const API_BASE = "http://localhost:3007";

export default function MyClassesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [makeupSessions, setMakeupSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        
        // Lấy user từ cookie
        const currentUser = await authService.getCurrentUser();
        console.log("👤 Current user:", currentUser);
        
        if (!currentUser) {
          console.warn("⚠️ Không tìm thấy user, chuyển hướng login");
          router.push("/login");
          return;
        }

        // Lấy studentId từ user
        const studentId = currentUser.user_id || currentUser.id;
        console.log("📌 Student ID:", studentId);
        
        if (!studentId) {
          console.error("❌ Không có student_id trong user data");
          setError("Không tìm thấy ID học viên");
          setLoading(false);
          return;
        }

        setUser(currentUser);
        await fetchMyCourses(studentId);
        
      } catch (error) {
        console.error("❌ Lỗi tải trang:", error);
        setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

  const fetchMyCourses = async (studentId) => {
    try {
      console.log(`📡 Fetching courses for student: ${studentId}`);
      
      // Lấy tất cả bookings
      const bookingsRes = await fetch(`${API_BASE}/bookings`);
      const allBookings = await bookingsRes.json();
      
      console.log(`📋 Tổng bookings: ${allBookings.length}`);
      
      // Lọc bookings của student này (so sánh student_id)
      const studentBookings = allBookings.filter(
        b => b.student_id === studentId
      );
      
      console.log(`📋 Bookings của student ${studentId}: ${studentBookings.length}`);
      
      // Lọc các booking có status confirmed hoặc pending
      const activeBookings = studentBookings.filter(
        b => b.status === "confirmed" || b.status === "pending"
      );
      
      console.log(`📋 Active bookings: ${activeBookings.length}`);
      
      // Lấy thông tin chi tiết từng course (từ bookings)
      let coursesList = [];
      if (activeBookings.length > 0) {
        const coursePromises = activeBookings.map(async (booking) => {
          try {
            const courseRes = await fetch(`${API_BASE}/courses?course_id=${booking.course_id}`);
            const courses = await courseRes.json();
            const course = courses[0];
            
            if (!course) {
              console.warn(`⚠️ Không tìm thấy course ${booking.course_id}`);
              return null;
            }
            
            // Lấy thông tin tutor
            let tutorName = "Chưa có thông tin";
            if (course.tutor_id) {
              const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${course.tutor_id}`);
              const tutors = await tutorRes.json();
              const tutor = tutors[0];
              if (tutor) {
                const userRes = await fetch(`${API_BASE}/users?user_id=${tutor.user_id}`);
                const users = await userRes.json();
                const tutorUser = users[0];
                tutorName = tutorUser?.full_name || "Gia sư";
              }
            }
            
            return {
              ...course,
              tutor_name: tutorName,
              booking_status: booking.status,
              booking_id: booking.booking_id,
            };
          } catch (err) {
            console.error(`❌ Lỗi lấy course ${booking.course_id}:`, err);
            return null;
          }
        });
        
        coursesList = (await Promise.all(coursePromises)).filter(c => c !== null);
      }

      // ✅ BỔ SUNG: Lấy các lớp riêng tư do chính student này tạo (createSchedule)
      try {
        const allCoursesRes = await fetch(`${API_BASE}/courses`);
        const allCourses = await allCoursesRes.json();
        
        const myCreatedCourses = (Array.isArray(allCourses) ? allCourses : []).filter(
          c => c.created_by === `student_${studentId}`
        );

        for (const c of myCreatedCourses) {
          // Tránh trùng lặp với các lớp đã lấy từ booking
          if (coursesList.some(existing => existing.course_id === c.course_id)) continue;

          let tutorName = "Chưa có thông tin";
          if (c.tutor_id) {
            const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${c.tutor_id}`);
            const tutors = await tutorRes.json();
            const tutor = tutors[0];
            if (tutor) {
              const userRes = await fetch(`${API_BASE}/users?user_id=${tutor.user_id}`);
              const users = await userRes.json();
              const tutorUser = users[0];
              tutorName = tutorUser?.full_name || "Gia sư";
            }
          }

          coursesList.push({
            ...c,
            tutor_name: tutorName,
            booking_status: "confirmed",
            booking_id: null,
          });
        }
      } catch (err) {
        console.error("❌ Lỗi lấy lớp riêng tư do student tạo:", err);
      }

      // ===== KHỬ TRÙNG COURSE THEO course_id =====
      const uniqueCoursesMap = new Map();
      coursesList.forEach((c) => {
        const id = c.course_id || c.id;
        if (id && !uniqueCoursesMap.has(id)) {
          uniqueCoursesMap.set(id, c);
        }
      });
      coursesList = Array.from(uniqueCoursesMap.values());

      // ===== LẤY BUỔI HỌC BÙ =====
      try {
        const sessionsRes = await fetch(`${API_BASE}/class_sessions`);
        const allSessions = await sessionsRes.json();
        const courseIds = coursesList.map(c => c.course_id || c.id);

        const makeups = (Array.isArray(allSessions) ? allSessions : []).filter(
          (s) =>
            s.is_makeup === true &&
            courseIds.includes(s.course_id) &&
            (s.session_status === "scheduled" || s.session_status === "completed")
        );

        // Gắn thêm tên lớp + tutor vào buổi bù để dễ hiển thị
        const enrichedMakeups = makeups.map((s) => {
          const relatedCourse = coursesList.find(
            (c) => (c.course_id || c.id) === s.course_id
          );
          return {
            ...s,
            course_title: relatedCourse?.title || s.lesson_title || "Buổi học bù",
            tutor_name: relatedCourse?.tutor_name || "Gia sư",
            permanent_room_url: relatedCourse?.permanent_room_url || null,
          };
        });

        setMakeupSessions(enrichedMakeups);
      } catch (err) {
        console.error("❌ Lỗi lấy buổi học bù:", err);
        setMakeupSessions([]);
      }

      console.log(`📚 Danh sách courses (đã khử trùng): ${coursesList.length}`);
      setCourses(coursesList);
      
    } catch (error) {
      console.error("❌ Lỗi lấy danh sách lớp học:", error);
      setError("Không thể tải danh sách lớp học");
    }
  };

  const handleDateClick = (course) => {
    router.push(`/my-classes/${course.course_id}`);
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
                Xem lịch học các lớp bạn đã đăng ký
              </p>
              <div className={styles.statsBadge}>
                <span className={styles.totalClasses}>
                  📖 {courses.length} lớp đang học
                  {makeupSessions.length > 0 && (
                    <span style={{ marginLeft: 8, color: "#c2410c" }}>
                      • {makeupSessions.length} buổi học bù
                    </span>
                  )}
                </span>
              </div>
            </div>

            {courses.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}></span>
                <h3>Chưa có lịch học</h3>
                <p>Bạn chưa đăng ký lớp học nào. Hãy tìm lớp ngay!</p>
                <a href="/classList" className={styles.findClassBtn}>
                  Tìm lớp học ngay
                </a>
              </div>
            ) : (
              <ClassCalendar
                courses={courses}
                makeupSessions={makeupSessions}
                onDateClick={handleDateClick}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}