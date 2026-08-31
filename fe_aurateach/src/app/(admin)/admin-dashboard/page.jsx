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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [period, startDate, endDate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const customRange = period === 'custom' && startDate && endDate ? { startDate, endDate } : null;
      const [statsData, regData, revData] = await Promise.all([
        adminService.getStats(),
        adminService.getRegistrationStats(period, customRange),
        adminService.getRevenueStats(period, customRange),
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

  const getPeriodLabel = (p) => {
    if (p === 'week') return '7 ngày qua';
    if (p === 'month') return '30 ngày qua';
    if (p === 'year') return '12 tháng qua';
    if (p === 'custom' && startDate && endDate) {
      const s = new Date(startDate).toLocaleDateString('vi-VN');
      const e = new Date(endDate).toLocaleDateString('vi-VN');
      return `từ ${s} đến ${e}`;
    }
    return '';
  };

  const periodLabel = getPeriodLabel(period);

  const handleExportReport = () => {
    alert('📊 Đang xuất báo cáo...');
    // TODO: Thêm logic xuất báo cáo PDF/Excel
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
          <h1 className={styles.headerIcon}><img src="/img/icons/group.png" alt="dashboard" className={styles.headerIconImg} /> Tổng quan</h1>
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
            <option value="custom">📅 Tùy chọn</option>
          </select>

          {period === 'custom' && (
            <div className={styles.customDateRange}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate && endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className={styles.dateInput}
              />
              <span>đến</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
          )}

          <button 
            onClick={handleExportReport} 
            className={styles.exportButton}
          >
            📊 Xuất báo cáo
          </button>
          <button onClick={handleRefresh} className={styles.refreshButton}>
            🔄 Làm mới
          </button>
        </div>
      </header>

      <StatsCards stats={stats} />

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}><img src="/img/icons/group.png" alt="Đăng ký" className={styles.chartIcon} /> Đăng ký tài khoản mới</h3>
          <p className={styles.chartSubtitle}>
            Số lượng học viên và gia sư đăng ký trong {periodLabel}
          </p>
          <RegistrationChart data={registrations} period={period} />
        </div>
        
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}><img src="/img/icons/money.png" alt="Doanh thu" className={styles.chartIcon} /> Doanh thu theo ngày</h3>
          <p className={styles.chartSubtitle}>
            Tổng phí nền tảng (35%) thu được từ tất cả gia sư trong {periodLabel}
          </p>
          <RevenueChart data={revenue} period={period} />
        </div>
      </div>
    </div>
  );
}