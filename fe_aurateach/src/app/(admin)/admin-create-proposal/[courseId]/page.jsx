"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import styles from "./page.module.css";

const API_BASE = "http://localhost:3007";

export default function AdminCreateProposal() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId;

  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Lấy course draft
        const courseRes = await fetch(`${API_BASE}/courses_draft?course_id=${courseId}`);
        const courseData = await courseRes.json();
        if (courseData.length > 0) {
          setCourse(courseData[0]);
        } else {
          setError("Không tìm thấy lớp học");
          return;
        }

        // Lấy tất cả users
        const usersRes = await fetch(`${API_BASE}/users`);
        const usersData = await usersRes.json();
        setUsers(usersData);

        // Lọc tutor (role === "tutor" và đã được duyệt)
        const tutorUsers = usersData.filter(u => u.role === "tutor");
        const tutorIds = tutorUsers.map(u => u.user_id);
        
        // Lấy thông tin tutors để kiểm tra verification_status
        const tutorsRes = await fetch(`${API_BASE}/tutors`);
        const tutorsData = await tutorsRes.json();
        
        const validTutors = tutorsData.filter(t => 
          t.verification_status === "approved" || t.verification_status === "Đã xác minh"
        );
        const validTutorIds = validTutors.map(t => t.user_id);
        
        const filteredTutors = tutorUsers.filter(u => validTutorIds.includes(u.user_id));
        setTutors(filteredTutors);

        // Lọc student (role === "student")
        const studentUsers = usersData.filter(u => u.role === "student");
        setStudents(studentUsers);

      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        setError("Không thể tải dữ liệu");
      }
    };

    if (courseId) {
      fetchData();
    }
  }, [courseId]);

  const handleStudentToggle = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!selectedTutor) {
      setError("Vui lòng chọn Tutor");
      setLoading(false);
      return;
    }

    if (selectedStudents.length < course?.min_students) {
      setError(`Vui lòng chọn ít nhất ${course?.min_students || 2} học sinh`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          tutor_id: selectedTutor,
          student_ids: selectedStudents,
          admin_id: "u-admin-1",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess("Gửi đề xuất thành công! Đang chuyển hướng...");
        setTimeout(() => {
          router.push("/admin-proposals");
        }, 1500);
      } else {
        setError(result.message || "Gửi đề xuất thất bại");
      }
    } catch (error) {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  if (!course && !error) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📨 Gửi đề xuất cho lớp</h1>
        <p>Chọn Tutor và Student để gửi đề xuất tham gia lớp học</p>
      </div>

      {error && <div className={styles.alertError}>{error}</div>}
      {success && <div className={styles.alertSuccess}>{success}</div>}

      <div className={styles.courseInfo}>
        <h3>{course?.title}</h3>
        <div className={styles.courseDetails}>
          <span>📅 {course?.schedule_days?.join(", ")} ({course?.time_slot})</span>
          <span>💰 {course?.price_per_session?.toLocaleString()}đ/buổi</span>
          <span>👥 Tối thiểu {course?.min_students} học sinh</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.card}>
          <h2>👨‍🏫 Chọn Tutor</h2>
          <div className={styles.tutorList}>
            {tutors.map((tutor) => (
              <label key={tutor.user_id} className={styles.tutorItem}>
                <input
                  type="radio"
                  name="tutor"
                  value={tutor.user_id}
                  checked={selectedTutor === tutor.user_id}
                  onChange={(e) => setSelectedTutor(e.target.value)}
                />
                <div className={styles.tutorInfo}>
                  <span className={styles.tutorName}>{tutor.full_name}</span>
                  <span className={styles.tutorStatus}>🟢 Sẵn sàng</span>
                </div>
              </label>
            ))}
            {tutors.length === 0 && (
              <p className={styles.emptyText}>Chưa có Tutor nào sẵn sàng nhận đề xuất</p>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <h2>👨‍🎓 Chọn Student (tối thiểu {course?.min_students || 2})</h2>
          <div className={styles.studentList}>
            {students.map((student) => (
              <label key={student.user_id} className={styles.studentItem}>
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.user_id)}
                  onChange={() => handleStudentToggle(student.user_id)}
                />
                <span className={styles.studentName}>{student.full_name}</span>
                <span className={styles.studentStatus}>🟢 Sẵn sàng</span>
              </label>
            ))}
            {students.length === 0 && (
              <p className={styles.emptyText}>Chưa có Student nào sẵn sàng nhận đề xuất</p>
            )}
          </div>
          <p className={styles.selectedCount}>Đã chọn: {selectedStudents.length} học sinh</p>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? "Đang gửi..." : "📤 Gửi đề xuất"}
        </button>
      </form>
    </div>
  );
}