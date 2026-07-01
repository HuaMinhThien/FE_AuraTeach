"use client";

import styles from "../management.module.css";

export default function ClassDetailModal({ selectedClass, onCloseModal, onCloseClass, getStatusBadge }) {
  if (!selectedClass) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCloseModal}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Chi tiết thông tin lớp học</h2>
          <button className={styles.closeModalX} onClick={onCloseModal}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <h3 className={styles.mClassName}>{selectedClass.class_name}</h3>
          <div className={styles.mBadgeRow}>
            {getStatusBadge(selectedClass.status)}
            <span>Thời gian học: <strong>{selectedClass.total_weeks} tuần</strong></span>
          </div>

          <div className={styles.mInfoGrid}>
            <p>📅 <strong>Ngày mở lớp:</strong> {selectedClass.start_date}</p>
            <p>📅 <strong>Ngày kết thúc:</strong> {selectedClass.end_date}</p>
          </div>

          <div className={styles.scheduleSection}>
            <h4>📆 Lịch học định kỳ:</h4>
            <div className={styles.dayBadges}>
              {selectedClass.schedule_days.map((day, idx) => (
                <span key={idx} className={styles.dayBadge}>{day}</span>
              ))}
            </div>
          </div>

          {/* Đường dẫn học trực tuyến Google Meet */}
          {(selectedClass.status === "active" || selectedClass.status === "closed") && (
            <div className={styles.meetSection}>
              <h4> Phòng học trực tuyến:</h4>
              <a href={selectedClass.meet_link} target="_blank" rel="noreferrer" className={styles.meetLink}>
                 Vào lớp học qua Google Meet
              </a>
            </div>
          )}

          {/* Bảng danh sách học sinh tham gia */}
          <div className={styles.studentSection}>
            <h4>👥 Thành viên lớp học ({selectedClass.students.length}):</h4>
            {selectedClass.students.length === 0 ? (
              <p className={styles.noStudent}>Chưa có học sinh nào đăng ký lớp học này.</p>
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
                  {selectedClass.students.map((st, index) => (
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
          {selectedClass.status === "active" && (
            <button className={styles.footerCloseBtn} onClick={() => onCloseClass(selectedClass.id)}>
               Khóa lớp (Dừng nhận thêm)
            </button>
          )}
          <button className={styles.footerCancelBtn} onClick={onCloseModal}>Đóng cửa sổ</button>
        </div>
      </div>
    </div>
  );
}