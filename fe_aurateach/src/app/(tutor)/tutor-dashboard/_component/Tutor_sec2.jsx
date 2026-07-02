"use client";
import Image from "next/image";
import styles from "../_css/sec2.module.css";

export default function Tutor_sec2({ classesData }) {
  const list = classesData || [];

  const handleJoinRoom = (url) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
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

          const isUrgent = item.isUrgent || item.status === "active"; 

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
                  <span>⏰ {item.time_slot || item.time || "Chưa xếp lịch"}</span>
                  <span>👥 {Array.isArray(item.students) ? `${item.students.length} học viên` : "0 học viên"}</span>
                </div>
              </div>

              <div className={styles.action}>
                {isUrgent ? (
                  <button 
                    className={styles.btnPrimary} 
                    onClick={() => handleJoinRoom(item.permanent_room_url)}
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