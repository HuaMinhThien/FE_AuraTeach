// /src/app/(admin)/admin-dashboard/page.jsx - PHIÊN BẢN ĐÚNG
'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import StatsCards from './_components/StatsCards';
import RegistrationChart from './_components/RegistrationChart';
import RevenueChart from './_components/RevenueChart';
import styles from './dashboard.module.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, regData, revData] = await Promise.all([
        adminService.getStats(),
        adminService.getRegistrationStats(period),
        adminService.getRevenueStats(period),
      ]);
      
      // 👇 Thêm dòng log này để nhìn rõ cấu trúc thực tế trên F12 -> Console
      console.log('Stats Data nhận được:', statsData);

      // Xử lý linh hoạt nếu API trả về dạng statsData.data hoặc thẳng vào object
      const actualStats = statsData?.data || statsData || {};
      setStats(actualStats);

      setRegistrations(regData?.data || regData || []);
      setRevenue(revData?.data || revData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{error}</p>
        <button onClick={handleRefresh} className={styles.retryButton}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>📊 Tổng quan</h1>
          <span className={styles.updateTime}>
            Cập nhật: {new Date().toLocaleString('vi-VN')}
          </span>
        </div>
        <div className={styles.headerRight}>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className={styles.periodSelector}
          >
            <option value="week">📅 7 ngày qua</option>
            <option value="month">📅 30 ngày qua</option>
            <option value="year">📅 12 tháng qua</option>
          </select>
          <button onClick={handleRefresh} className={styles.refreshButton}>
            🔄 Làm mới
          </button>
        </div>
      </header>

      <StatsCards stats={stats} />

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3>📈 Đăng ký tài khoản mới</h3>
          <p className={styles.chartSubtitle}>
            Số lượng học viên và gia sư đăng ký trong 7 ngày qua
          </p>
          <RegistrationChart data={registrations} />
        </div>
        
        <div className={styles.chartCard}>
          <h3>💰 Doanh thu theo ngày</h3>
          <p className={styles.chartSubtitle}>
            Doanh thu thực tế sau khi trừ phí nền tảng (10%) trong 7 ngày qua
          </p>
          <RevenueChart data={revenue} />
        </div>
      </div>
    </div>
  );
}