"use client";

import styles from "../management.module.css";

export default function ClassDetailModal({ selectedClass, onCloseModal, onCloseClass, getStatusBadge }) {
  if (!selectedClass) return null;
  console.log("Dữ liệu lớp chi tiết:", selectedClass);
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
          {console.log("DEBUG: schedule_days là:", selectedClass.schedule_days)}
          <div className={styles.scheduleSection}>
            <h4>📆 Lịch học định kỳ:</h4>
            <div className={styles.dayBadges}>
              {(() => {
                // Đặt đoạn xử lý logic vào đây
                const days = typeof selectedClass.schedule_days === 'string' 
                  ? JSON.parse(selectedClass.schedule_days) 
                  : (selectedClass.schedule_days || []);
                
                // Kiểm tra nếu không phải mảng (để tránh lỗi .map is not a function)
                const safeDays = Array.isArray(days) ? days : [];
                
                return safeDays.map((day, idx) => (
                  <span key={idx} className={styles.dayBadge}>{day}</span>
                ));
              })()}
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
            {(() => {
              let students = selectedClass.students;
              if (typeof students === 'string') {
                  try { students = JSON.parse(students); } catch (e) { students = []; }
              }
              const safeStudents = Array.isArray(students) ? students : [];

              return (
                <>
                  <h4>👥 Thành viên lớp học ({safeStudents.length}):</h4>
                  {safeStudents.length === 0 ? (
                    <p className={styles.noStudent}>Chưa có học sinh nào đăng ký.</p>
                  ) : (
                    <table className={styles.studentTable}>
                      {/* ... nội dung bảng ... */}
                      <tbody>
                        {safeStudents.map((st, index) => (
                          <tr key={st.student_id || index}>
                            <td>{index + 1}</td>
                            <td><strong>{st.full_name}</strong></td>
                            <td>{st.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <div className={styles.modalFooter}>
          {selectedClass.status === "active" && (
            <button className={styles.footerCloseBtn} onClick={() => onCloseClass(selectedClass.course_id)}>
               Khóa lớp (Dừng nhận thêm)
            </button>
          )}
          <button className={styles.footerCancelBtn} onClick={onCloseModal}>Đóng cửa sổ</button>
        </div>
      </div>
    </div>
  );
}