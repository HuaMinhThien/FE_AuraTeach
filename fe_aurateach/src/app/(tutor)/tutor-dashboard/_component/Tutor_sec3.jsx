"use client";
import styles from "../_css/sec3.module.css";

export default function Tutor_sec3({ activitiesData }) {
  const defaultActivities = [
    {
      id: 1,
      icon: "👤",
      iconClass: styles.blueIcon,
      content: <><strong>Lê Minh Anh</strong> vừa đăng ký khóa học <a>Toán 9</a></>,
      time: "Vừa mới xong"
    },
    {
      id: 2,
      icon: "⭐",
      iconClass: styles.goldIcon,
      content: <><strong>Trần Quốc Huy</strong> đã đánh giá 5 sao cho bạn. <p className={styles.quote}>"Thầy dạy văn rất truyền cảm hứng!"</p></>,
      time: "2 giờ trước"
    },
    {
      id: 3,
      icon: "🔔",
      iconClass: styles.indigoIcon,
      content: <>Lớp Tiếng Anh Tiểu học sẽ bắt đầu sau 2 giờ nữa.</>,
      time: "Hệ thống nhắc nhở"
    },
    {
      id: 4,
      icon: "💵",
      iconClass: styles.orangeIcon,
      content: <>Học phí mới nhận được: <strong>1,200,000đ</strong>.</>,
      time: "Từ phụ huynh Nguyễn Lan"
    }
  ];

  const items = activitiesData || defaultActivities;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Hoạt động mới nhất</h3>
      <div className={styles.timeline}>
        {items.map((act) => (
          <div key={act.id} className={styles.activityItem}>
            <div className={`${styles.iconBox} ${act.iconClass}`}>
              {act.icon}
            </div>
            <div className={styles.details}>
              <div className={styles.contentBody}>{act.content}</div>
              <span className={styles.timeLabel}>{act.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}