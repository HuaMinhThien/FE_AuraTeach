'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './timesheet.module.css';
import Image from 'next/image';

export default function TutorTimesheetPage() {
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  // ===== Lấy cookie =====
  const getCookie = (name) => {
    if (typeof window === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // ===== Load dữ liệu =====
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const userCookie = getCookie('user_info');
        if (!userCookie) {
          setLoading(false);
          return;
        }

        let raw = userCookie;
        try { raw = decodeURIComponent(userCookie); } catch (e) {}
        const userData = JSON.parse(raw);
        const userId = userData.user_id || userData.id;

        // Lấy tutor_id
        const tutorRes = await fetch(`http://localhost:3007/tutors?user_id=${userId}`);
        const tutors = await tutorRes.json();
        if (!Array.isArray(tutors) || tutors.length === 0) {
          setLoading(false);
          return;
        }
        const actualTutorId = tutors[0].tutor_id;
        setTutorId(actualTutorId);

        // Lấy courses + sessions + payouts
        const [coursesRes, sessionsRes, payoutsRes] = await Promise.all([
          fetch(`http://localhost:3007/courses?tutor_id=${actualTutorId}`),
          fetch(`http://localhost:3007/class_sessions`),
          fetch(`http://localhost:3007/tutor_payouts?tutor_id=${actualTutorId}`),
        ]);

        const coursesData = await coursesRes.json();
        const sessionsData = await sessionsRes.json();
        const payoutsData = await payoutsRes.json();

        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setPayouts(Array.isArray(payoutsData) ? payoutsData : []);
      } catch (err) {
        console.error('Lỗi tải dữ liệu chấm công:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // ===== Hàm tính số giờ từ start_time - end_time =====
  const calculateHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const startMinutes = sh * 60 + (sm || 0);
      const endMinutes = eh * 60 + (em || 0);
      const diff = endMinutes - startMinutes;
      return diff > 0 ? diff / 60 : 0;
    } catch {
      return 0;
    }
  };

  // ===== Tính toán dữ liệu theo tháng được chọn =====
  const monthlyData = useMemo(() => {
    if (!tutorId) return null;

    const filteredSessions = sessions.filter((s) => {
      if (!s.actual_date) return false;
      const d = new Date(s.actual_date);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });

    // Nhóm theo course
    const courseMap = {};

    courses.forEach((course) => {
      const courseId = course.course_id || course.id;
      const courseSessions = filteredSessions.filter(
        (s) => s.course_id === courseId
      );

      if (courseSessions.length === 0) return;

      const completed = courseSessions.filter((s) => s.session_status === 'completed');
      const uncompleted = courseSessions.filter((s) => s.session_status !== 'completed');

      const price = Number(course.price_per_session) || 0;
      let numStudents = 0;
      if (Array.isArray(course.students) && course.students.length > 0) {
        numStudents = course.students.length;
      }

      // Công thức: mỗi buổi completed = price * numStudents * 0.65
      const income = completed.length * price * (numStudents || 1) * 0.65;

      // Tính tổng giờ của lớp này
      let courseHours = 0;
      completed.forEach((s) => {
        courseHours += calculateHours(s.start_time, s.end_time);
      });

      courseMap[courseId] = {
        course,
        allSessions: courseSessions,
        completedCount: completed.length,
        uncompletedCount: uncompleted.length,
        totalSessionsInMonth: courseSessions.length,
        income: Math.round(income),
        price,
        numStudents: numStudents || 1,
        hours: courseHours,
      };
    });

    const courseList = Object.values(courseMap);

    // Tổng hợp
    const totalIncome = courseList.reduce((sum, c) => sum + c.income, 0);
    const totalCompleted = courseList.reduce((sum, c) => sum + c.completedCount, 0);
    const totalUncompleted = courseList.reduce((sum, c) => sum + c.uncompletedCount, 0);
    const totalHours = courseList.reduce((sum, c) => sum + c.hours, 0);

    return {
      courseList,
      totalIncome,
      totalCompleted,
      totalUncompleted,
      totalHours: Math.round(totalHours * 10) / 10, // làm tròn 1 chữ số thập phân
    };
  }, [tutorId, courses, sessions, selectedMonth, selectedYear]);

  // ===== Helpers =====
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const monthNames = [
    'Tháng 01', 'Tháng 02', 'Tháng 03', 'Tháng 04', 'Tháng 05', 'Tháng 06',
    'Tháng 07', 'Tháng 08', 'Tháng 09', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 2; y--) {
    years.push(y);
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải bảng chấm công...</p>
      </div>
    );
  }

  if (!monthlyData) {
    return (
      <div className={styles.container}>
        <p style={{ textAlign: 'center', padding: 40 }}>Không tìm thấy thông tin gia sư</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ===== HEADER ===== */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Bảng chấm công & Thu nhập</h1>
          <p className={styles.subtitle}>Theo dõi buổi dạy và thu nhập theo tháng</p>
        </div>

        {/* Month / Year Picker */}
        <div className={styles.monthPicker}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className={styles.select}
          >
            {monthNames.map((name, idx) => (
              <option key={idx} value={idx}>{name}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={styles.select}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.incomeCard}`}>
          <div className={styles.cardIcon}>
            <Image src="/img/icons/money1.png" alt="Income Icon" width={30} height={30} />
          </div>
          <div>
            <p className={styles.cardLabel}>Tổng thu nhập dự kiến</p>
            <p className={styles.cardValue}>{formatCurrency(monthlyData.totalIncome)}</p>
            <p className={styles.cardSub}>Đã trừ 35% phí sàn</p>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.completedCard}`}>
          <div className={styles.cardIcon}>
            <Image src="/img/icons/checked (2).png" alt="Income Icon" width={30} height={30} />
          </div>
          <div>
            <p className={styles.cardLabel}>Buổi đã hoàn thành</p>
            <p className={styles.cardValue1}>{monthlyData.totalCompleted} buổi</p>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.missedCard}`}>
          <div className={styles.cardIcon}>
            <Image src="/img/icons/warning.png" alt=" Icon" width={30} height={30} />
          </div>
          <div>
            <p className={styles.cardLabel}>Buổi bỏ lỡ / quá hạn</p>
            <p className={styles.cardValue} styles={{ color: "#FFA237" }}>
              {monthlyData.totalUncompleted} buổi
              {monthlyData.totalUncompleted > 0 && (
                <span className={styles.warningBadge}>Cảnh báo</span>
              )}
            </p>
          </div>
        </div>

        {/* ===== THẺ MỚI: TỔNG GIỜ ĐÃ DẠY ===== */}
        <div className={`${styles.summaryCard} ${styles.hoursCard}`}>
          <div className={styles.cardIcon}>
            <Image src="/img/icons/clock.png" alt="Clock Icon" width={30} height={30} />
          </div>
          <div>
            <p className={styles.cardLabel}>Tổng giờ đã dạy</p>
            <p className={styles.cardValue}>
              {monthlyData.totalHours} giờ
            </p>
          </div>
        </div>
      </div>

      {/* ===== DANH SÁCH LỚP ===== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Danh sách lớp học trong {monthNames[selectedMonth]}/{selectedYear}
        </h2>

        {monthlyData.courseList.length === 0 ? (
          <div className={styles.emptyState}>
            Không có buổi học nào trong tháng này
          </div>
        ) : (
          <div className={styles.courseList}>
            {monthlyData.courseList.map((item) => {
              const isExpanded = expandedCourseId === (item.course.course_id || item.course.id);
              const courseId = item.course.course_id || item.course.id;

              return (
                <div key={courseId} className={styles.courseCard}>
                  {/* Header lớp */}
                  <div className={styles.courseHeader}>
                    <div className={styles.courseInfo}>
                      <h3 className={styles.courseName}>
                        {item.course.title || item.course.course_name || 'Lớp học'}
                      </h3>
                      <div className={styles.courseMeta}>
                        <span>
                          {item.course.start_time && item.course.end_time
                            ? `${item.course.start_time} - ${item.course.end_time}`
                            : item.course.time_slot || '—'}
                        </span>
                        <span>•</span>
                        <span>{formatCurrency(item.price)} / buổi / hs</span>
                        <span>•</span>
                        <span>{item.numStudents} học sinh</span>
                      </div>
                    </div>

                    <div className={styles.courseStats}>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Tiến độ</span>
                        <span className={styles.statValue}>
                          {item.completedCount} / {item.totalSessionsInMonth} buổi
                        </span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Thu nhập lớp</span>
                        <span className={`${styles.statValue} ${styles.incomeValue}`}>
                          {formatCurrency(item.income)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nút xem chi tiết */}
                  <button
                    className={styles.detailBtn}
                    onClick={() =>
                      setExpandedCourseId(isExpanded ? null : courseId)
                    }
                  >
                    {isExpanded ? 'Thu gọn nhật ký' : 'Xem chi tiết nhật ký buổi học'}
                    <span>{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* Danh sách buổi học chi tiết */}
                  {isExpanded && (
                    <div className={styles.sessionList}>
                      <table className={styles.sessionTable}>
                        <thead>
                          <tr>
                            <th>Ngày dạy</th>
                            <th>Giờ học</th>
                            <th>Trạng thái</th>
                            <th>Ghi chú / Record</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.allSessions
                            .sort((a, b) => new Date(a.actual_date) - new Date(b.actual_date))
                            .map((s) => (
                              <tr key={s.session_id || s.id}>
                                <td>{formatDate(s.actual_date)}</td>
                                <td>
                                  {s.start_time && s.end_time
                                    ? `${s.start_time} - ${s.end_time}`
                                    : '—'}
                                </td>
                                <td>
                                  {s.session_status === 'completed' ? (
                                    <span className={styles.badgeCompleted}>Hoàn thành</span>
                                  ) : (
                                    <span className={styles.badgeMissed}>
                                      Bỏ lỡ / Quá hạn
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {s.record_url ? (
                                    <a
                                      href={s.record_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.recordLink}
                                    >
                                      Xem record
                                    </a>
                                  ) : (
                                    <span style={{ color: '#94a3b8' }}>—</span>
                                  )}
                                  {s.tutor_note && (
                                    <div className={styles.note}>{s.tutor_note}</div>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 