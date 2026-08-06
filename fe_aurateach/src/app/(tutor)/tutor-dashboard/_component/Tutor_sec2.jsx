"use client";
import Image from "next/image";
import styles from "../_css/sec2.module.css";
import { getClassroomRoomPath } from "@/utils/roomUtils";

export default function Tutor_sec2({ classesData }) {
  const list = classesData || [];

  const handleJoinRoom = (course) => {
    if (course) {
      window.open(getClassroomRoomPath(course, "tutor"), "_blank", "noopener,noreferrer");
    } else {
      alert("Lớp học hiện tại chưa được cấu hình đường link phòng học!");
    }
  };

  if (list.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h3>Lớp học sắp diễn ra</h3>
          <a href="/classroom-management" className={styles.viewAll}>Xem tất cả</a>
        </div>
        <div style={{ padding: "20px 0", color: "#666", textAlign: "center" }}>
          Hiện tại không có lớp học nào sắp diễn ra.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h3>Lớp học sắp diễn ra</h3>
        <a href="/classroom-management" className={styles.viewAll}>Xem tất cả</a>
      </div>

      <div className={styles.list}>
        {list.map((item) => {
          const isUrgent = item.isUrgent || false;
          const studentCount = Array.isArray(item.students) ? item.students.length : 0;

          return (
            <div key={item.id || item.course_id} className={styles.classCard}>
              <div className={styles.imageWrapper}>
                <Image 
                  src={item.thumbnail || "/img/class/default-class-9.png"} 
                  width={64} 
                  height={64} 
                  alt={item.title || "thumbnail"} 
                />
              </div>
              
              <div className={styles.info}>
                <span className={`${styles.tag} ${isUrgent ? styles.urgent : ""}`}>
                  {item.tag || "SẮP DIỄN RA"}
                </span>
                <h4>{item.title}</h4>
                <div className={styles.meta}>
                  <span>⏰ {item.time || "Chưa xếp lịch"}</span>
                  <span>👥 {studentCount} học viên</span>
                </div>
                {item.studentNames && item.studentNames.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    👤 {item.studentNames.join(', ')}
                  </div>
                )}
              </div>

              <div className={styles.action}>
                {isUrgent ? (
                  <button 
                    className={styles.btnPrimary} 
                    onClick={() => handleJoinRoom(item)}
                  >
                    Vào lớp
                  </button>
                ) : (
                  <button className={styles.btnSecondary}>Chi tiết</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}