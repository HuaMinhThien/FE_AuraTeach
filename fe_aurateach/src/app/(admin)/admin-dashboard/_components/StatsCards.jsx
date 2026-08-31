import React from 'react';
import styles from '../dashboard.module.css';  // ← Sửa từ '../_css/dashboard.module.css' thành '../dashboard.module.css'

export default function StatsCards({ stats }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const cards = [
    {
      title: 'Học viên',
      value: stats?.totalStudents?.toLocaleString() || '0',
      icon: '/img/icons/multiple-users-silhouette.png',
      color: '#4f46e5',
      bgColor: '#eef2ff',
    },
    {
      title: 'Gia sư',
      value: stats?.totalTutors?.toLocaleString() || '0',
      icon: '/img/icons/team.png',
      color: '#059669',
      bgColor: '#ecfdf5',
    },
    {
      title: 'Khóa học',
      value: stats?.totalCourses?.toLocaleString() || '0',
      icon: '📚',
      color: '#d97706',
      bgColor: '#fffbeb',
    },
    {
      title: 'Doanh thu',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: '/img/icons/money.png',
      color: '#dc2626',
      bgColor: '#fef2f2',
    },
  ];

  return (
    <div className={styles.statsGrid}>
      {cards.map((card, index) => (
        <div key={index} className={styles.statCard}>
          <div 
            className={styles.statIcon}
            style={{ backgroundColor: card.bgColor }}
          >
            {card.icon.endsWith('.png') ? (
              <img src={card.icon} alt={card.title} className={styles.statIconImg} />
            ) : (
              <span style={{ color: card.color }}>{card.icon}</span>
            )}
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>{card.title}</p>
            <p className={styles.statValue}>{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}