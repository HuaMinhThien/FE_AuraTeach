"use client";

import styles from "../management.module.css";
import { getClassroomRoomPath } from "@/utils/roomUtils";

export default function ClassDetailModal({ selectedClass, onCloseModal, onCloseClass, getStatusBadge }) {
  if (!selectedClass) return null;

  const handleJoinRoom = (selectedClass) => {
    try {
      // Lấy trực tiếp trường permanent_room_url từ object selectedClass
      if (selectedClass && selectedClass.permanent_room_url) {
        const roomUrl = selectedClass.permanent_room_url;

        // Mở liên kết trong tab mới nếu là đường dẫn HTTP/HTTPS
        if (roomUrl.startsWith("http://") || roomUrl.startsWith("https://")) {
          window.open(roomUrl, "_blank");
        } else {
          // Mở trong cùng trang nếu là route nội bộ
          window.location.href = roomUrl;
        }
      } else {
        alert("Lớp học này chưa có liên kết phòng học (permanent_room_url)!");
      }
    } catch (error) {
      console.error("Lỗi khi tham gia phòng học:", error);
      alert("Đã xảy ra lỗi khi cố gắng chuyển hướng đến đường dẫn phòng học!");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onCloseModal}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Chi tiết thông tin lớp học</h2>
          <button className={styles.closeModalX} onClick={onCloseModal}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <h3 className={styles.mClassName}>{selectedClass.class_name || selectedClass.title}</h3>
          <div className={styles.mBadgeRow}>
            {getStatusBadge(selectedClass.status)}
            <span>Thời gian học: <strong>{selectedClass.total_weeks} tuần</strong></span>
          </div>

          <div className={styles.mInfoGrid}>
            <p>📅 <strong>Ngày mở lớp:</strong> {selectedClass.start_date}</p>
            <p>📅 <strong>Ngày kết thúc:</strong> {selectedClass.end_date || "Chưa cập nhật"}</p>
          </div>

          <div>
            <button 
              type="button"
              onClick={handleJoinRoom ? () => handleJoinRoom(selectedClass) : null}
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
              Vào phòng học AuraTeach ➔
            </button>
          </div>

          <div className={styles.scheduleSection}>
            <h4>📆 Lịch học định kỳ:</h4>
            <div className={styles.dayBadges}>
              {selectedClass.schedule_days && selectedClass.schedule_days.map((day, idx) => (
                <span key={idx} className={styles.dayBadge}>{day}</span>
              ))}
            </div>
          </div>

          {/* Bảng danh sách học sinh tham gia */}
          <div className={styles.studentSection}>
            <h4>👥 Thành viên lớp học ({selectedClass.students ? selectedClass.students.length : 0}/{selectedClass.max_students || "∞"}):</h4>
            {!selectedClass.students || selectedClass.students.length === 0 ? (
              <p className={styles.noStudent}>Chưa có học sinh nào đăng ký lớp học này.</p>
            ) : (
              <table className={styles.studentTable}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ và Tên</th>
                    <th>Email Liên Hệ</th>
                    <th>Số Điện Thoại</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedClass.students.map((st, index) => (
                    <tr key={typeof st === 'object' ? (st.student_id || index) : index}>
                      <td>{index + 1}</td>
                      <td><strong>{typeof st === 'object' ? st.full_name : st}</strong></td>
                      <td>{typeof st === 'object' ? st.email : "N/A"}</td>
                      <td>{typeof st === 'object' ? (st.phone || "Chưa cập nhật") : "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          {selectedClass.status === "active" && (
            <button className={styles.footerCloseBtn} onClick={() => onCloseClass(selectedClass.class_id || selectedClass.id)}>
               Khóa lớp (Dừng nhận thêm)
            </button>
          )}
          <button className={styles.footerCancelBtn} onClick={onCloseModal}>Đóng cửa sổ</button>
        </div>
      </div>
    </div>
  );
}