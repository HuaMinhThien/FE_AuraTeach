"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "../_css/sec2.module.css";
import { courseService } from "@/services/courseService";

export default function Tutor_sec2({ classesData, onRefreshData }) {
  const [list, setList] = useState(classesData || []);

  // Cập nhật lại list khi props classesData thay đổi từ cha
  useEffect(() => {
    setList(classesData || []);
    
    // Tự động gọi fetch ngầm số lượng học viên cho từng lớp nếu chưa có sẵn
    if (classesData && classesData.length > 0) {
      classesData.forEach(async (cls, index) => {
        const courseId = cls.id || cls.course_id;
        if (courseId && (cls.current_students === undefined || cls.current_students === null)) {
          try {
            const res = await courseService.getCourseDetail(courseId);
            const detail = res?.data || res;
            if (detail) {
              const subs = detail.subscriptions || [];
              const activeCount = subs.filter((sub) => sub.status === "active").length || detail.students?.length || 0;
              
              setList((prevList) => {
                const newList = [...prevList];
                if (newList[index]) {
                  newList[index] = {
                    ...newList[index],
                    current_students: activeCount,
                  };
                }
                return newList;
              });
            }
          } catch (e) {
            console.error("Lỗi tự động đếm học viên:", e);
          }
        }
      });
    }
  }, [classesData]);

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
   * Mở modal chi tiết và tự động gọi API lấy danh sách học sinh active của lớp
   */
  const handleOpenDetail = async (item) => {
    setSelectedClass(item);

    try {
      const courseId = item.id || item.course_id;
      const res = await courseService.getCourseDetail(courseId);
      const detailData = res?.data || res;

      if (detailData) {
        const subscriptions = detailData.subscriptions || [];
        const activeStudents = subscriptions
          .filter((sub) => sub.status === "active")
          .map((sub) => sub.student || sub.user || {});

        const formattedTime = detailData.time_slot || item.time || "";

        setSelectedClass((prev) => ({
          ...prev,
          ...detailData,
          time: formattedTime,
          enrolledStudentsDetails: activeStudents.length > 0 ? activeStudents : (detailData.students || prev?.enrolledStudentsDetails || [])
        }));
      }
    } catch (error) {
      console.error("Không thể tải chi tiết danh sách học sinh:", error);
    }
  };

  const parseDateTimeSlot = (dateStr, timeSlotStr, timeType = "start") => {
    if (!dateStr || !timeSlotStr) return null;

    try {
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth();
      let day = now.getDate();

      const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}-\d{1,2})/);
      if (dateMatch) {
        const matched = dateMatch[0];
        if (matched.includes("-")) {
          const parts = matched.split("-").map(Number);
          if (parts.length === 3) {
            [year, month, day] = [parts[0], parts[1] - 1, parts[2]];
          } else if (parts.length === 2) {
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

      const timeParts = timeSlotStr.split("-");
      let targetStr = timeType === "end" ? (timeParts.length > 1 ? timeParts[1].trim() : timeParts[0].trim()) : timeParts[0].trim();

      const timeMatch = targetStr.match(/(\d{1,2}):(\d{2})/);
      if (!timeMatch) return null;

      return new Date(year, month, day, Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    } catch (err) {
      console.error("Lỗi parse ngày giờ:", err);
      return null;
    }
  };

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
            // Lấy số lượng học viên ưu tiên từ state hiện tại
            const studentCount = item.current_students ?? item.students_count ?? item.studentsCount ?? 0;

            return (
              <div key={item.id || item.course_id} className={styles.classCard}>
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
                    <span>👥 {studentCount} học viên</span>
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
                      onClick={() => handleOpenDetail(item)}
                    >
                      Chi tiết
                    </button>
                  )}
                </div>
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
                <div><strong>Lịch học:</strong> {selectedClass.schedule_days?.join(", ") || "Theo lịch biểu"}</div>
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