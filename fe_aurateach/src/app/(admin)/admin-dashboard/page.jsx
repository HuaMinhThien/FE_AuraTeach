'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminService } from '@/services/adminService'; // Hoặc đường dẫn tương đối phù hợp với cấu trúc của bạn
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

  // Hàm mapping text hiển thị cho phụ đề biểu đồ tùy theo period
  const periodTextMap = {
    week: '7 ngày qua',
    month: '30 ngày qua',
    year: '12 tháng qua'
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Gọi song song các API để tối ưu hiệu suất tải dữ liệu
      const [statsRes, regRes, revRes] = await Promise.all([
        adminService.getStats(),
        adminService.getRegistrationStats(period),
        adminService.getRevenueStats(period),
      ]);
      
      setStats(statsRes?.data || statsRes);
      setRegistrations(regRes?.data || regRes || []);
      setRevenue(revRes?.data || revRes || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Không thể kết nối đến máy chủ để tải dữ liệu thống kê. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải dữ liệu tổng quan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{error}</p>
        <button onClick={fetchDashboardData} className={styles.retryButton}>
          🔄 Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>📊 Tổng quan hệ thống</h1>
          <span className={styles.updateTime}>
            Cập nhật lúc: {new Date().toLocaleString('vi-VN')}
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
          <button onClick={fetchDashboardData} className={styles.refreshButton}>
            🔄 Làm mới
          </button>
        </div>
      </header>

      {/* Thẻ thống kê tổng số lượng */}
      <StatsCards stats={stats} />

      {/* Khu vực biểu đồ thống kê */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3>📈 Đăng ký tài khoản mới</h3>
          <p className={styles.chartSubtitle}>
            Số lượng học viên và gia sư đăng ký trong {periodTextMap[period]}
          </p>
          <RegistrationChart data={registrations} />
        </div>
        
        <div className={styles.chartCard}>
          <h3>💰 Doanh thu theo thời gian</h3>
          <p className={styles.chartSubtitle}>
            Doanh thu thực tế sau khi trừ phí nền tảng trong {periodTextMap[period]}
          </p>
          <RevenueChart data={revenue} />
        </div>
      </div>
    </div>
  );
}