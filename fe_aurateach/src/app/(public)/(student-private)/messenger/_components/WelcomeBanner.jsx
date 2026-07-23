"use client";

import styles from "./WelcomeBanner.module.css";

export default function WelcomeBanner({ userName = "bạn", unreadCount = 0, conversationCount = 0 }) {
  return (
    <div className={styles.welcomeBanner}>
      <div className={styles.bannerContent}>
        <h2 className={styles.welcomeTitle}>
          Chào mừng {userName} đến với <span className={styles.highlight}>Messenger</span>
        </h2>
        <p className={styles.welcomeDesc}>
          Nơi kết nối gia sư và học viên một cách nhanh chóng, tiện lợi.
        </p>

        <div className={styles.statsContainer}>
          {conversationCount > 0 && (
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{conversationCount}</span>
              <span className={styles.statLabel}>Cuộc trò chuyện</span>
            </div>
          )}
          {unreadCount > 0 && (
            <div className={`${styles.statItem} ${styles.unreadStat}`}>
              <span className={styles.statNumber}>{unreadCount}</span>
              <span className={styles.statLabel}>Chưa đọc</span>
            </div>
          )}
          <div className={styles.statItem}>
            <span className={styles.statNumber}>💬</span>
            <span className={styles.statLabel}>Trò chuyện ngay</span>
          </div>
        </div>
      </div>

      <div className={styles.decorationCircles}>
        <div className={`${styles.circle} ${styles.circle1}`}></div>
        <div className={`${styles.circle} ${styles.circle2}`}></div>
        <div className={`${styles.circle} ${styles.circle3}`}></div>
      </div>
    </div>
  );
}

