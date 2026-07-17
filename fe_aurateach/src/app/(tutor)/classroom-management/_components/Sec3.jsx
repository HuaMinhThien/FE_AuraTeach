"use client";

import styles from "../management.module.css";

export default function CourseDetailModal({ selectedCourse, onCloseModal, onCloseCourse, getStatusBadge }) {
  if (!selectedCourse) return null;

  const handleJoinRoom = () => {
    const url = selectedCourse.permanent_room_url;
    
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert("Khóa học hiện tại chưa được cấu hình đường link phòng học Google Meet!");
    }
  };

  const scheduleDays = Array.isArray(selectedCourse.schedule_days) ? selectedCourse.schedule_days : [];
  const studentsList = Array.isArray(selectedCourse.students) ? selectedCourse.students : [];

  return (
    <div className={styles.modalOverlay} onClick={onCloseModal}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Chi tiết thông tin khóa học</h2>
          <button className={styles.closeModalX} onClick={onCloseModal}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <h3 className={styles.mClassName}>{selectedCourse.title || selectedCourse.course_name}</h3>
          <div className={styles.mBadgeRow}>
            {getStatusBadge(selectedCourse.status)}
            <span>Thời gian học: <strong>{selectedCourse.total_weeks || 0} tuần</strong></span>
          </div>

          <div className={styles.mInfoGrid}>
            <p>📅 <strong>Ngày mở khóa học:</strong> {selectedCourse.start_date}</p>
            <p>📅 <strong>Ngày kết thúc:</strong> {selectedCourse.end_date}</p>
          </div>

          <div>
            <button 
              type="button"
              onClick={handleJoinRoom}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              Vào phòng học (Google Meet) ➔
            </button>
          </div>

          <div className={styles.scheduleSection}>
            <h4>📆 Lịch học định kỳ:</h4>
            <div className={styles.dayBadges}>
              {scheduleDays.map((day, idx) => (
                <span key={idx} className={styles.dayBadge}>{day}</span>
              ))}
            </div>
          </div>

          <div className={styles.studentSection}>
            <h4>👥 Thành viên khóa học ({studentsList.length}):</h4>
            {studentsList.length === 0 ? (
              <p className={styles.noStudent}>Chưa có học sinh nào đăng ký khóa học này.</p>
            ) : (
              <table className={styles.studentTable}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ và Tên</th>
                    <th>Email Liên Hệ</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsList.map((st, index) => (
                    <tr key={st.student_id}>
                      <td>{index + 1}</td>
                      <td><strong>{st.full_name}</strong></td>
                      <td>{st.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          {selectedCourse.status === "active" && (
            <button className={styles.footerCloseBtn} onClick={() => onCloseCourse(selectedCourse.course_id)}>
               Khóa khóa học (Dừng nhận thêm)
            </button>
          )}
          <button className={styles.footerCancelBtn} onClick={onCloseModal}>Đóng cửa sổ</button>
        </div>
      </div>
    </div>
  );
}