"use client";
import Image from "next/image";
import styles from "../_css/sec1.module.css";

export default function Tutor_sec1({ tutorName = "Thiện", statsData }) {

  const defaultStats = {
    totalIncome: "0đ",
    incomeGrowth: "Chưa có thu nhập",
    totalStudents: 0,
    studentsGrowth: "0 lớp",
    openClasses: "00",
    rating: "0.0/5.0"
  };

  const data = statsData || defaultStats;

  return (
    <section className={styles.welcomeSection}>
      <div className={styles.headerTitle}>
        <h1>Chào mừng trở lại, Giáo viên {tutorName}</h1>
        <p>Đây là tổng quan về các lớp học phổ thông và hiệu quả giảng dạy của bạn trong tháng này.</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <span className={styles.icon}>
              <Image src="/img/icons/money1.png" alt="money" width={20} height={20} />
            </span>
            <span className={`${styles.badge} ${data.incomeGrowth.includes('chờ') ? styles.goldBg : styles.greenBg}`}>
              {data.incomeGrowth}
            </span>
          </div>
          <p className={styles.cardLabel}>Tổng thu nhập</p>
          <h2 className={styles.cardValue}>{data.totalIncome}</h2>
        </div>

        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <span className={styles.icon}>
              <Image src="/img/icons/group.png" alt="student" width={20} height={20} />
            </span>
            <span className={`${styles.badge} ${styles.greenBg}`}>{data.studentsGrowth}</span>
          </div>
          <p className={styles.cardLabel}>Tổng học viên</p>
          <h2 className={styles.cardValue}>{data.totalStudents}</h2>
        </div>

        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <span className={styles.icon}>
              <Image src="/img/icons/online-meeting.png" alt="class" width={20} height={20} />
            </span>
            <span className={`${styles.badge} ${styles.blueBg}`}>Đang chạy</span>
          </div>
          <p className={styles.cardLabel}>Lớp học đang mở</p>
          <h2 className={styles.cardValue}>{data.openClasses}</h2>
        </div>

        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <span className={styles.icon}>
              <Image src="/img/icons/star.png" alt="class" width={20} height={20} />
            </span>
            <span className={`${styles.badge} ${styles.goldBg}`}>Đánh giá</span>
          </div>
          <p className={styles.cardLabel}>Đánh giá trung bình</p>
          <h2 className={styles.cardValue}>{data.rating}</h2>
        </div>
      </div>
    </section>
  );
}