"use client";

import styles from "../management.module.css";

export default function ClassDetailModal({ selectedClass, onCloseModal, onCloseClass, getStatusBadge }) {
  if (!selectedClass) return null;

  // 💡 Xử lý logic lọc học sinh active ngay từ đầu để code JSX bên dưới sạch sẽ
  const activeSubscriptions = selectedClass.subscriptions
    ? selectedClass.subscriptions.filter((sub) => sub.status === "active")
    : [];

  const handleJoinRoom = () => {
    const url = selectedClass.schedules && selectedClass.schedules.length > 0 
      ? selectedClass.schedules[0].meeting_platform 
      : null;
    
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert("Lớp học hiện tại chưa được cấu hình đường link phòng học Google Meet trong lịch trình!");
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
          <h3 className={styles.mClassName}>{selectedClass.title}</h3>
          
          <div className={styles.mBadgeRow}>
            {getStatusBadge(selectedClass.status)}
            <span>Thời gian học: <strong>{selectedClass.total_weeks} tuần</strong></span>
          </div>

          <div className={styles.mInfoGrid}>
            <p>🏷️ <strong>Mã lớp:</strong> {selectedClass.course_id}</p>
            <p>💰 <strong>Học phí/giờ:</strong> {Number(selectedClass.price_per_session).toLocaleString("vi-VN")} đ</p>
            <p>👥 <strong>Sĩ số:</strong> {selectedClass.current_students} / {selectedClass.max_students} học viên</p>
            <p>📊 <strong>Cấp độ:</strong> {selectedClass.level}</p>
          </div>

          {/* Phần mô tả lớp học */}
          {selectedClass.description && (
            <div style={{ margin: "12px 0", fontSize: "14px", color: "#4b5563" }}>
              <p>📝 <strong>Mô tả:</strong> {selectedClass.description}</p>
            </div>
          )}

          <div style={{ marginTop: "16px" }}>
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

          {/* Lịch học định kỳ & Link Google Meet */}
          <div className={styles.scheduleSection}>
            <h4>📆 Lịch học định kỳ & Link Google Meet:</h4>
            <div className={styles.dayBadges} style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
              {selectedClass.schedules && selectedClass.schedules.length > 0 ? (
                selectedClass.schedules.map((sch, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "13px" }}>
                    <span>📅 <strong>{sch.day_of_week}</strong> ({sch.time_slot})</span>
                    {sch.meeting_platform ? (
                      <a href={sch.meeting_platform} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline", fontWeight: "500" }}>
                        🔗 Link Meet riêng
                      </a>
                    ) : (
                      <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Chưa có link</span>
                    )}
                  </div>
                ))
              ) : (
                <span style={{ fontSize: "13px", color: "#6b7280" }}>Đang cập nhật lịch học tuần</span>
              )}
            </div>
          </div>

          {/* Bảng danh sách học sinh tham gia (Chỉ lấy học sinh active) */}
          <div className={styles.studentSection}>
            <h4>👥 Thành viên lớp học ({activeSubscriptions.length}):</h4>
            
            {activeSubscriptions.length === 0 ? (
              <p className={styles.noStudent}>Chưa có học sinh nào đang hoạt động trong lớp học này.</p>
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
                  {activeSubscriptions.map((sub, index) => {
                    const studentInfo = sub.student || sub.user || {};
                    const userObj = studentInfo.user || studentInfo; 

                    return (
                      <tr key={sub.subscription_id || index}>
                        <td>{index + 1}</td>
                        <td><strong>{userObj?.full_name || userObj?.name || "Không rõ tên"}</strong></td>
                        <td>{userObj?.email || "Chưa có email"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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