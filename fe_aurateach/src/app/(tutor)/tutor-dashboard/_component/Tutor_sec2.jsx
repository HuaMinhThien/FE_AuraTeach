"use client";
import Image from "next/image";
import styles from "../_css/sec2.module.css";

export default function Tutor_sec2({ classesData }) {
    
  const defaultClasses = [
    {
      id: 1,
      tag: "BẮT ĐẦU TRONG 15 PHÚT",
      title: "Toán nâng cao - Ôn thi vào 10",
      time: "19:30 - 21:30",
      students: "24 học viên",
      image: "/img/cover-math.jpg", 
      isUrgent: true
    },
    {
      id: 2,
      tag: "NGÀY MAI, 08:30",
      title: "Ngữ văn lớp 7 - Bồi dưỡng học sinh giỏi",
      time: "08:30 - 11:30",
      students: "18 học viên",
      image: "/img/cover-literature.jpg",
      isUrgent: false
    },
    {
      id: 3,
      tag: "THỨ 4, 14:00",
      title: "Tiếng Anh giao tiếp tiểu học",
      time: "14:00 - 16:00",
      students: "32 học viên",
      image: "/img/cover-english.jpg",
      isUrgent: false
    }
  ];

  const list = classesData || defaultClasses;
  console.log(list);
  

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h3>Lớp học sắp diễn ra</h3>
        <a href="/classroom-management" className={styles.viewAll}>Xem tất cả</a>
      </div>

      <div className={styles.list}>
        {list.map((item) => (
          <div key={item.id} className={styles.classCard}>
            <div className={styles.imageWrapper}>
              <Image src={item.thumbnail} width={64} height={64} alt="" />
            </div>
            
            <div className={styles.info}>
              <span className={`${styles.tag} ${item.isUrgent ? styles.urgent : ""}`}>
                {item.tag}
              </span>
              <h4>{item.title}</h4>
              <div className={styles.meta}>
                <span>⏰ {item.time}</span>
                <span>👥 {item.students}</span>
              </div>
            </div>

            <div className={styles.action}>
              {item.isUrgent ? (
                <button className={styles.btnPrimary}>Vào lớp</button>
              ) : (
                <button className={styles.btnSecondary}>Chi tiết</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}