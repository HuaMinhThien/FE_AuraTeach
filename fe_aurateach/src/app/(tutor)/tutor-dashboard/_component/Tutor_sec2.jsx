"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "../_css/sec2.module.css";
import { lessonConfirmationService } from "@/services/lessonConfirmationService";
import { courseService } from "@/services/courseService";

export default function Tutor_sec2({ classesData, pendingConfirmations = [], onRefreshData }) {
  const list = classesData || [];

  // State Modal Chi tiết lớp học & Confirm Popup
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeConfirmSession, setActiveConfirmSession] = useState(null);

  // Form input
  const [driveLink, setDriveLink] = useState("");
  const [sessionNote, setSessionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleJoinRoom = (url) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert("Lớp học hiện tại chưa được cài đặt link phòng học!");
    }
  };

  /**
   * Helper kiểm tra xem thời điểm hiện tại đã vượt qua giờ kết thúc buổi học hay chưa.
   */
  const isSessionEnded = (lessonDateStr, timeSlotStr) => {
    if (!lessonDateStr || !timeSlotStr) return false;

    try {
      const pureDateStr = lessonDateStr.includes("T") 
        ? lessonDateStr.split("T")[0] 
        : lessonDateStr;
      
      const [year, month, day] = pureDateStr.split("-").map(Number);

      const parts = timeSlotStr.split("-");
      const endTimeStr = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      const [hours, minutes] = endTimeStr.split(":").map(Number);

      const endDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);

      return new Date() >= endDateTime;
    } catch (err) {
      console.error("Lỗi parse ngày giờ:", err);
      return false;
    }
  };

  /**
   * Mở modal chi tiết và tự động gọi API lấy danh sách học sinh active của lớp
   */
  const handleOpenDetail = async (item) => {
    // Mở popup trước với dữ liệu thô từ item để hiển thị tức thì
    setSelectedClass(item);

    try {
      const courseId = item.id || item.course_id;
      const res = await courseService.getCourseDetail(courseId);
      const detailData = res?.data || res;

      if (detailData) {
        // Lọc lấy các học sinh có subscription đang active từ backend
        const subscriptions = detailData.subscriptions || [];
        const activeStudents = subscriptions
          .filter((sub) => sub.status === "active")
          .map((sub) => sub.student || sub.user || {});

        const formattedTime = detailData.time_slot || item.time || "";

        setSelectedClass((prev) => ({
          ...prev,
          ...detailData,
          // Đảm bảo trường time luôn là chuỗi giờ học, không bị lẫn ngày tháng
          time: formattedTime,
          enrolledStudentsDetails: activeStudents.length > 0 ? activeStudents : (detailData.students || prev?.enrolledStudentsDetails || [])
        }));
      }
    } catch (error) {
      console.error("Không thể tải chi tiết danh sách học sinh:", error);
    }
  };

  /**
   * Xử lý khi nhấn nút "Xác nhận buổi học"
   */
  const handleOpenConfirmModal = async (pendingSession) => {
    try {
      let timeSlot = pendingSession.time_slot;

      if (!timeSlot) {
        const courseRes = await courseService.getCourseDetail(pendingSession.course_id);
        const courseData = courseRes?.data || courseRes;
        if (courseData) {
          timeSlot = courseData.time_slot;
        }
      }

      const cleanTimeSlot = (timeSlot || "").replace(/[^0-9:\-\s]/g, "").trim();
      const hasEnded = isSessionEnded(pendingSession.lesson_date, cleanTimeSlot);

      if (!hasEnded) {
        alert("Buổi học chưa kết thúc hoặc chưa tới giờ học! Bạn chỉ có thể xác nhận sau khi hết giờ học.");
        return;
      }

      setActiveConfirmSession({
        ...pendingSession,
        time_slot: cleanTimeSlot || pendingSession.time_slot
      });
    } catch (error) {
      console.error("Lỗi khi kiểm tra thời gian buổi học:", error);
      alert("Không thể kiểm tra thông tin buổi học. Vui lòng thử lại!");
    }
  };

  // Gia sư nhấn nút "Xác nhận hoàn thành buổi học"
  const handleConfirmCompletion = async (e) => {
    e.preventDefault();
    if (!driveLink.trim()) {
      setFormError("Vui lòng nhập đường dẫn Google Drive chứa video / bằng chứng buổi học!");
      return;
    }
    setFormError("");
    setIsSubmitting(true);

    try {
      const session = activeConfirmSession;
      
      const lessonAmount = Math.round(
        session.price_per_session * session.duration_hours * session.students_count
      );

      const now = new Date();
      const submittedAtIso = now.toISOString();
      const payoutAvailableAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      await lessonConfirmationService.updateLessonConfirmation(session.comfirmation_id, {
        comfirmation_id: session.comfirmation_id,
        course_id: session.course_id,
        tutor_id: session.tutor_id,
        lesson_number: session.lesson_number || 1,
        lesson_date: session.lesson_date,
        record_url: driveLink,
        note: sessionNote,
        submitted_at: submittedAtIso,
        holding_hours: 24,
        payout_available_at: payoutAvailableAt,
        status: "pending_review",
        lesson_amount: lessonAmount,
        payout_status: "holding"
      });

      alert(`Xác nhận hoàn thành thành công! ${lessonAmount.toLocaleString("vi-VN")}đ đã chuyển vào ví chờ duyệt.`);
      
      setActiveConfirmSession(null);
      setDriveLink("");
      setSessionNote("");
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra khi gửi xác nhận.");
    } finally {
      setIsSubmitting(false);
    }
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
            const pendingSession = pendingConfirmations.find(p => p.course_id === item.id);

            const rawTimeSlot = pendingSession?.time_slot || item.time_slot || item.time || "";
            const cleanTimeSlot = rawTimeSlot.replace(/[^0-9:\-\s]/g, "").trim();

            const canConfirm = pendingSession 
              ? isSessionEnded(pendingSession.lesson_date, cleanTimeSlot)
              : false;

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
                  {pendingSession && (
                    <button
                      className={styles.btnPrimary}
                      style={{ 
                        backgroundColor: canConfirm ? "#eab308" : "#94a3b8", 
                        borderColor: canConfirm ? "#eab308" : "#94a3b8",
                        cursor: canConfirm ? "pointer" : "not-allowed"
                      }}
                      disabled={!canConfirm}
                      title={!canConfirm ? "Buổi học chưa kết thúc hoặc chưa đến ngày giờ học" : ""}
                      onClick={() => handleOpenConfirmModal(pendingSession)}
                    >
                      {canConfirm ? "Xác nhận buổi học" : "Chưa hết giờ học"}
                    </button>
                  )}

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
                      onClick={() => handleOpenDetail(item)}
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

      {/* POPUP 1: XEM CHI TIẾT LỚP HỌC */}
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

              <h5>Danh sách lớp ({selectedClass.enrolledStudentsDetails?.length || 0})</h5>
              {selectedClass.enrolledStudentsDetails && selectedClass.enrolledStudentsDetails.length > 0 ? (
                <div className={styles.studentList}>
                  {selectedClass.enrolledStudentsDetails.map((st, idx) => {
                    const studentObj = st.student || st.user || st;
                    const fullName = studentObj.full_name || studentObj.name || "Không rõ tên";
                    const contact = studentObj.email || studentObj.phone || "Chưa cập nhật thông tin";
                    const avatar = studentObj.avatar || "/img/avt/avt.jpg";

                    return (
                      <div key={idx} className={styles.studentItem}>
                        <Image
                          src={avatar}
                          width={36}
                          height={36}
                          alt="student avatar"
                          style={{ borderRadius: "50%", objectFit: "cover" }}
                        />
                        <div>
                          <div className={styles.studentName}>{fullName}</div>
                          <div className={styles.studentContact}>{contact}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.emptyText}>Chưa có học sinh nào đăng ký lớp này.</p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.btnPrimary} 
                onClick={() => handleJoinRoom(selectedClass.permanent_room_url)}
              >
                Tham gia / Vào lớp
              </button>
              <button className={styles.btnSecondary} onClick={() => setSelectedClass(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 2: XÁC NHẬN HOÀN THÀNH BUỔI HỌC */}
      {activeConfirmSession && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Xác nhận hoàn thành buổi học</h3>
              <button className={styles.closeBtn} onClick={() => setActiveConfirmSession(null)}>✕</button>
            </div>

            <form onSubmit={handleConfirmCompletion}>
              <div className={styles.modalBody}>
                <div className={styles.alertBox}>
                  ⏰ Buổi học <strong>{activeConfirmSession.course_title}</strong> (ngày {activeConfirmSession.lesson_date}, {activeConfirmSession.time_slot}) đã kết thúc. Vui lòng cập nhật bằng chứng giảng dạy.
                </div>

                <div className={styles.earningsSummary}>
                  <div><strong>Thời lượng dạy:</strong> {activeConfirmSession.duration_hours} giờ</div>
                  <div><strong>Số học viên:</strong> {activeConfirmSession.students_count} học sinh</div>
                  <div>
                    <strong>Thu nhập nhận được:</strong>{" "}
                    <span style={{ color: "#16a34a", fontSize: "16px", fontWeight: "bold" }}>
                      {Math.round(
                        activeConfirmSession.price_per_session * activeConfirmSession.duration_hours * activeConfirmSession.students_count
                      ).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Link Google Drive lưu Video / Bằng chứng <span style={{ color: "red" }}>*</span></label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    required
                    className={styles.inputControl}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Ghi chú bài học</label>
                  <textarea
                    rows={3}
                    placeholder="Nhập nội dung bài học đã giảng dạy..."
                    value={sessionNote}
                    onChange={(e) => setSessionNote(e.target.value)}
                    className={styles.inputControl}
                  />
                </div>

                {formError && <div className={styles.errorMessage}>{formError}</div>}
              </div>

              <div className={styles.modalFooter}>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                  {isSubmitting ? "Đang xử lý..." : "Xác nhận hoàn thành"}
                </button>
                <button type="button" className={styles.btnSecondary} onClick={() => setActiveConfirmSession(null)}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}