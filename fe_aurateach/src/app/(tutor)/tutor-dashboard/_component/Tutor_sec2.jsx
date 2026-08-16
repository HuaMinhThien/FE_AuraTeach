"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "../_css/sec2.module.css";
import { getClassroomRoomPath } from "@/utils/roomUtils";

export default function Tutor_sec2({ classesData, pendingConfirmations = [], onRefreshData }) {
  const router = useRouter();
  const list = classesData || [];

  // State Modal Chi tiết lớp học
  const [selectedClass, setSelectedClass] = useState(null);

  const handleJoinRoom = (url) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert("Lớp học hiện tại chưa được cài đặt link phòng học!");
    }
  };

  /**
   * Helper trích xuất đối tượng Date chính xác từ chuỗi ngày và khung giờ
   * Hỗ trợ các định dạng ngày: "2026-08-17", "17-08", "NGÀY MAI, 17-08", ISO string...
   * timeType: "start" (giờ bắt đầu) | "end" (giờ kết thúc)
   */
  const parseDateTimeSlot = (dateStr, timeSlotStr, timeType = "start") => {
    if (!dateStr || !timeSlotStr) return null;

    try {
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth();
      let day = now.getDate();

      // Trích xuất chuỗi số dạng YYYY-MM-DD hoặc DD-MM từ dateStr
      const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}-\d{1,2})/);
      if (dateMatch) {
        const matched = dateMatch[0];
        if (matched.includes("-")) {
          const parts = matched.split("-").map(Number);
          if (parts.length === 3) {
            [year, month, day] = [parts[0], parts[1] - 1, parts[2]];
          } else if (parts.length === 2) {
            // Trường hợp DD-MM
            [day, month] = [parts[0], parts[1] - 1];
          }
        }
      } else if (!isNaN(Date.parse(dateStr))) {
        const parsedDate = new Date(dateStr);
        year = parsedDate.getFullYear();
        month = parsedDate.getMonth();
        day = parsedDate.getDate();
      } else {
        return null;
      }

      // Trích xuất giờ từ timeSlotStr (ví dụ: "07:00-09:00" hoặc "07:00 - 09:00")
      const timeParts = timeSlotStr.split("-");
      let timeTargetStr = "";
      if (timeType === "end") {
        timeTargetStr = timeParts.length > 1 ? timeParts[1].trim() : timeParts[0].trim();
      } else {
        timeTargetStr = timeParts[0].trim();
      }

      const timeMatch = timeTargetStr.match(/(\d{1,2}):(\d{2})/);
      if (!timeMatch) return null;

      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);

      return new Date(year, month, day, hours, minutes, 0, 0);
    } catch (err) {
      console.error("Lỗi parse ngày giờ:", err);
      return null;
    }
  };

  /**
   * Kiểm tra thời điểm hiện tại đã đến hoặc qua giờ bắt đầu chưa
   */
  const isSessionStarted = (lessonDateStr, timeSlotStr) => {
    const startTargetDate = parseDateTimeSlot(lessonDateStr, timeSlotStr, "start");
    if (!startTargetDate) return false;
    return new Date() >= startTargetDate;
  };

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h3>Lớp học sắp diễn ra</h3>
        <a href="/classroom-management" className={styles.viewAll}>
          Xem tất cả
        </a>
      </div>

      {list.length === 0 ? (
        <div style={{ padding: "30px 0", color: "#64748b", textAlign: "center", fontSize: "14px" }}>
          Hiện tại không có lớp học nào sắp diễn ra.
        </div>
      ) : (
        <div className={styles.list}>
          {list.map((item) => {
            return (
              <div key={item.id} className={styles.classCard}>
                <div className={styles.imageWrapper}>
                  <Image
                    src={item.thumbnail || "/img/class/default-class-9.png"}
                    width={64}
                    height={64}
                    alt={item.title || "thumbnail"}
                    style={{ objectFit: "cover", borderRadius: "8px" }}
                  />
                </div>

                <div className={styles.info}>
                  <span className={`${styles.tag} ${item.isLive ? styles.urgent : ""}`}>
                    {item.tag}
                  </span>
                  <h4>{item.title}</h4>
                  <div className={styles.meta}>
                    <span>⏰ {item.time}</span>
                    <span>👥 {item.studentsCount} học viên</span>
                  </div>
                </div>

                <div className={styles.action} style={{ display: "flex", gap: "8px" }}>
                  {item.isLive ? (
                    <button
                      className={styles.btnPrimary}
                      onClick={() => handleJoinRoom(item.permanent_room_url)}
                    >
                      Vào lớp
                    </button>
                  ) : (
                    <button 
                      className={styles.btnSecondary}
                      onClick={() => setSelectedClass(item)}
                    >
                      Chi tiết
                    </button>
                  )}
                </div>
                {item.studentNames && item.studentNames.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    👤 {item.studentNames.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP: XEM CHI TIẾT LỚP HỌC */}
      {selectedClass && (
        <div className={styles.modalOverlay} onClick={() => setSelectedClass(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Chi tiết lớp học</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedClass(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <h4>{selectedClass.title}</h4>
              <p className={styles.classDesc}>{selectedClass.description || "Không có mô tả."}</p>

              <div className={styles.detailGrid}>
                <div><strong>Trình độ:</strong> {selectedClass.level || "N/A"}</div>
                <div><strong>Học phí / giờ:</strong> {selectedClass.price_per_session?.toLocaleString("vi-VN")}đ/h</div>
                <div><strong>Lịch học:</strong> {selectedClass.schedule_days?.join(", ")}</div>
                <div><strong>Khung giờ:</strong> {selectedClass.time}</div>
              </div>

              <hr className={styles.divider} />

              <h5>Danh sách học sinh đã đăng ký ({selectedClass.enrolledStudentsDetails?.length || 0})</h5>
              {selectedClass.enrolledStudentsDetails && selectedClass.enrolledStudentsDetails.length > 0 ? (
                <div className={styles.studentList}>
                  {selectedClass.enrolledStudentsDetails.map((st, idx) => (
                    <div key={idx} className={styles.studentItem}>
                      <Image
                        src={st.avatar || "/img/avt/avt.jpg"}
                        width={36}
                        height={36}
                        alt="student avatar"
                        style={{ borderRadius: "50%", objectFit: "cover" }}
                      />
                      <div>
                        <div className={styles.studentName}>{st.full_name}</div>
                        <div className={styles.studentContact}>{st.email || st.phone || "Chưa cập nhật thông tin"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>Chưa có học sinh nào đăng ký lớp này.</p>
              )}
            </div>

            <div className={styles.modalFooter}>
              {isSessionStarted(
                selectedClass.tag || selectedClass.next_lesson_date || selectedClass.date, 
                selectedClass.time_slot || selectedClass.time
              ) && (
                <button 
                  className={styles.btnPrimary} 
                  onClick={() => handleJoinRoom(selectedClass.permanent_room_url)}
                >
                  Vào lớp
                </button>
              )}
              <button className={styles.btnSecondary} onClick={() => setSelectedClass(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}