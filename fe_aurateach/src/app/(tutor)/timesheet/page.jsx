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

  // ===== State cho Modal Học bù =====
  const [showMakeupModal, setShowMakeupModal] = useState(false);
  const [selectedMissedSession, setSelectedMissedSession] = useState(null);
  const [makeupDate, setMakeupDate] = useState('');
  const [makeupStartTime, setMakeupStartTime] = useState('19:00');
  const [makeupEndTime, setMakeupEndTime] = useState('21:00');
  const [makeupNote, setMakeupNote] = useState('');
  const [isSubmittingMakeup, setIsSubmittingMakeup] = useState(false);

  // Danh sách giờ bắt đầu: 07:00 → 21:00 (bước 30 phút)
  const START_TIME_OPTIONS = useMemo(() => {
    const options = [];
    for (let h = 7; h <= 21; h++) {
      for (const m of [0, 30]) {
        if (h === 21 && m === 30) break; // tối đa 21:00
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        options.push(`${hh}:${mm}`);
      }
    }
    return options;
  }, []);

  // Ngày tối thiểu = ngày mai
  const minMakeupDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // ===== Lấy cookie =====
  const getCookie = (name) => {
    if (typeof window === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // ===== Load dữ liệu =====
  const fetchData = async () => {
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

      const tutorRes = await fetch(`http://localhost:3007/tutors?user_id=${userId}`);
      const tutors = await tutorRes.json();
      if (!Array.isArray(tutors) || tutors.length === 0) {
        setLoading(false);
        return;
      }
      const actualTutorId = tutors[0].tutor_id;
      setTutorId(actualTutorId);

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

  useEffect(() => {
    fetchData();
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

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  // Cộng 2 tiếng vào giờ bắt đầu → giờ kết thúc
  const addTwoHours = (startTime) => {
    const [h, m] = startTime.split(':').map(Number);
    let newH = h + 2;
    if (newH > 23) newH = 23;
    return `${String(newH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
  };

  // Khi đổi giờ bắt đầu → tự cập nhật giờ kết thúc (+2h)
  const handleStartTimeChange = (value) => {
    setMakeupStartTime(value);
    setMakeupEndTime(addTwoHours(value));
  };

  // ===== Kiểm tra buổi đã có học bù chưa =====
  const hasMakeupForSession = (sessionId) => {
    return sessions.some(
      (s) => s.is_makeup === true && s.makeup_for_session_id === sessionId
    );
  };

  // ===== Kiểm tra trùng lịch (gia sư + học sinh) =====
  const checkScheduleConflict = (dateStr, startTime, endTime, courseId) => {
    const conflicts = [];
    const dayMap = {
      0: 'Chủ Nhật',
      1: 'Thứ 2',
      2: 'Thứ 3',
      3: 'Thứ 4',
      4: 'Thứ 5',
      5: 'Thứ 6',
      6: 'Thứ 7',
    };

    const targetDate = new Date(dateStr + 'T00:00:00');
    const dayName = dayMap[targetDate.getDay()];
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    const isOverlap = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;

    // 1) Trùng với các buổi class_sessions đã có (của gia sư)
    sessions.forEach((s) => {
      if (!s.actual_date || !s.start_time || !s.end_time) return;
      if (s.session_status === 'cancelled') return;

      const sDate = new Date(s.actual_date).toISOString().split('T')[0];
      if (sDate !== dateStr) return;

      // Chỉ kiểm tra buổi thuộc lớp của gia sư này
      const relatedCourse = courses.find(
        (c) => (c.course_id || c.id) === s.course_id
      );
      if (!relatedCourse) return;

      const sStart = timeToMinutes(s.start_time);
      const sEnd = timeToMinutes(s.end_time);

      if (isOverlap(newStart, newEnd, sStart, sEnd)) {
        conflicts.push(
          `Gia sư đã có buổi "${s.lesson_title || relatedCourse.title || s.course_id}" lúc ${s.start_time}-${s.end_time}`
        );
      }
    });

    // 2) Trùng lịch cố định (schedule_days + time_slot) của các lớp khác của gia sư
    courses.forEach((c) => {
      const cId = c.course_id || c.id;
      if (cId === courseId) return; // bỏ qua chính lớp đang bù
      if (c.status && c.status !== 'active') return;
      if (!Array.isArray(c.schedule_days) || !c.time_slot) return;
      if (!c.schedule_days.includes(dayName)) return;

      const [cStartStr, cEndStr] = c.time_slot.split('-').map((t) => t.trim());
      if (!cStartStr || !cEndStr) return;

      const cStart = timeToMinutes(cStartStr);
      const cEnd = timeToMinutes(cEndStr);

      if (isOverlap(newStart, newEnd, cStart, cEnd)) {
        conflicts.push(
          `Gia sư trùng lịch lớp "${c.title || cId}" (${c.time_slot}) vào ${dayName}`
        );
      }
    });

    // 3) Trùng lịch học sinh trong lớp (các lớp khác của học sinh đó)
    const currentCourse = courses.find(
      (c) => (c.course_id || c.id) === courseId
    );
    const studentIds = Array.isArray(currentCourse?.students)
      ? currentCourse.students
      : [];

    if (studentIds.length > 0) {
      // Lấy tất cả courses (cần fetch thêm nếu chưa có đủ)
      // Ở đây dùng courses hiện có + sessions; để chính xác hơn có thể mở rộng fetch all courses
      courses.forEach((c) => {
        const cId = c.course_id || c.id;
        if (cId === courseId) return;
        if (c.status && c.status !== 'active') return;
        if (!Array.isArray(c.students) || c.students.length === 0) return;
        if (!Array.isArray(c.schedule_days) || !c.time_slot) return;
        if (!c.schedule_days.includes(dayName)) return;

        const hasSharedStudent = c.students.some((sid) =>
          studentIds.includes(sid)
        );
        if (!hasSharedStudent) return;

        const [cStartStr, cEndStr] = c.time_slot.split('-').map((t) => t.trim());
        if (!cStartStr || !cEndStr) return;

        const cStart = timeToMinutes(cStartStr);
        const cEnd = timeToMinutes(cEndStr);

        if (isOverlap(newStart, newEnd, cStart, cEnd)) {
          conflicts.push(
            `Học sinh trùng lịch lớp "${c.title || cId}" (${c.time_slot}) vào ${dayName}`
          );
        }
      });

      // Trùng với session cụ thể của học sinh (các buổi khác)
      sessions.forEach((s) => {
        if (!s.actual_date || !s.start_time || !s.end_time) return;
        if (s.session_status === 'cancelled') return;

        const sDate = new Date(s.actual_date).toISOString().split('T')[0];
        if (sDate !== dateStr) return;

        const relatedCourse = courses.find(
          (c) => (c.course_id || c.id) === s.course_id
        );
        if (!relatedCourse) return;
        if (!Array.isArray(relatedCourse.students)) return;

        const hasSharedStudent = relatedCourse.students.some((sid) =>
          studentIds.includes(sid)
        );
        if (!hasSharedStudent) return;

        // Bỏ qua chính session gốc đang bù
        if (
          selectedMissedSession &&
          (s.session_id === selectedMissedSession.session_id ||
            s.id === selectedMissedSession.id)
        ) {
          return;
        }

        const sStart = timeToMinutes(s.start_time);
        const sEnd = timeToMinutes(s.end_time);

        if (isOverlap(newStart, newEnd, sStart, sEnd)) {
          conflicts.push(
            `Học sinh trùng buổi "${s.lesson_title || relatedCourse.title}" lúc ${s.start_time}-${s.end_time}`
          );
        }
      });
    }

    // Khử trùng thông báo
    return [...new Set(conflicts)];
  };

  // ===== Mở modal tạo học bù =====
  const openMakeupModal = (session) => {
    setSelectedMissedSession(session);
    setMakeupDate('');
    const defaultStart = session.start_time && session.start_time >= '07:00' && session.start_time <= '21:00'
      ? session.start_time
      : '19:00';
    setMakeupStartTime(defaultStart);
    setMakeupEndTime(addTwoHours(defaultStart));
    setMakeupNote('');
    setShowMakeupModal(true);
  };

  // ===== Tạo buổi học bù =====
  const handleCreateMakeup = async (e) => {
    e.preventDefault();
    if (!selectedMissedSession || !makeupDate || !makeupStartTime || !makeupEndTime) {
      alert('Vui lòng điền đầy đủ thông tin ngày và giờ!');
      return;
    }

    // Validate ngày >= ngày mai
    if (makeupDate < minMakeupDate) {
      alert('Ngày bù phải cách ngày hiện tại ít nhất 1 ngày (từ ngày mai trở đi).');
      return;
    }

    // Validate giờ trong khoảng 07:00 - 21:00
    const startMin = timeToMinutes(makeupStartTime);
    if (startMin < timeToMinutes('07:00') || startMin > timeToMinutes('21:00')) {
      alert('Giờ bắt đầu chỉ được chọn từ 07:00 đến 21:00.');
      return;
    }

    const courseId =
      selectedMissedSession.course_id ||
      (courses.find((c) =>
        (c.course_id || c.id) === selectedMissedSession.course_id
      )?.course_id);

    // Kiểm tra trùng lịch
    const conflicts = checkScheduleConflict(
      makeupDate,
      makeupStartTime,
      makeupEndTime,
      courseId
    );

    if (conflicts.length > 0) {
      alert(
        'Không thể tạo buổi học bù vì bị trùng lịch:\n\n• ' +
          conflicts.join('\n• ')
      );
      return;
    }

    try {
      setIsSubmittingMakeup(true);

      const res = await fetch('/api/class-sessions/makeup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_session_id: selectedMissedSession.session_id || selectedMissedSession.id,
          actual_date: makeupDate,
          start_time: makeupStartTime,
          end_time: makeupEndTime,
          tutor_note: makeupNote,
          tutor_id: tutorId,
        }),
      });

      const result = await res.json();

      if (result.success) {
        alert('Đã tạo buổi học bù thành công!');
        setShowMakeupModal(false);
        setSelectedMissedSession(null);
        await fetchData();
      } else {
        alert(result.message || 'Không thể tạo buổi học bù');
      }
    } catch (error) {
      console.error('Lỗi tạo học bù:', error);
      alert('Có lỗi xảy ra khi tạo buổi học bù');
    } finally {
      setIsSubmittingMakeup(false);
    }
  };

  // ===== Tính toán dữ liệu theo tháng được chọn =====
  const monthlyData = useMemo(() => {
    if (!tutorId) return null;

    const startDate = new Date(selectedYear, selectedMonth, 5);
    const endDate = new Date(selectedYear, selectedMonth + 1, 5, 23, 59, 59, 999);

    const filteredSessions = sessions.filter((s) => {
      if (!s.actual_date) return false;
      const d = new Date(s.actual_date);
      return d >= startDate && d <= endDate;
    });

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

      const income = completed.length * price * (numStudents || 1) * 0.65;

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

    const totalIncome = courseList.reduce((sum, c) => sum + c.income, 0);
    const totalCompleted = courseList.reduce((sum, c) => sum + c.completedCount, 0);
    const totalUncompleted = courseList.reduce((sum, c) => sum + c.uncompletedCount, 0);
    const totalHours = courseList.reduce((sum, c) => sum + c.hours, 0);

    return {
      courseList,
      totalIncome,
      totalCompleted,
      totalUncompleted,
      totalHours: Math.round(totalHours * 10) / 10,
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
            <p className={styles.cardValue}>
              {monthlyData.totalUncompleted} buổi
              {monthlyData.totalUncompleted > 0 && (
                <span className={styles.warningBadge}>Cảnh báo</span>
              )}
            </p>
          </div>
        </div>

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
          <span style={{ fontWeight: 400, fontSize: '14px', color: '#64748b', marginLeft: 8 }}>
            ({String(5).padStart(2, '0')}/{String(selectedMonth + 1).padStart(2, '0')}/{selectedYear}
            {' → '}
            {String(5).padStart(2, '0')}/{String(selectedMonth === 11 ? 1 : selectedMonth + 2).padStart(2, '0')}/{selectedMonth === 11 ? selectedYear + 1 : selectedYear})
          </span>
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

                  <button
                    className={styles.detailBtn}
                    onClick={() =>
                      setExpandedCourseId(isExpanded ? null : courseId)
                    }
                  >
                    {isExpanded ? 'Thu gọn nhật ký' : 'Xem chi tiết nhật ký buổi học'}
                    <span>{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div className={styles.sessionList}>
                      <table className={styles.sessionTable}>
                        <thead>
                          <tr>
                            <th>Ngày dạy</th>
                            <th>Giờ học</th>
                            <th>Trạng thái</th>
                            <th>Ghi chú / Record</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.allSessions
                            .sort((a, b) => new Date(a.actual_date) - new Date(b.actual_date))
                            .map((s) => {
                              const isMakeup = s.is_makeup === true;
                              const alreadyHasMakeup = hasMakeupForSession(s.session_id || s.id);

                              return (
                                <tr key={s.session_id || s.id}>
                                  <td>
                                    {formatDate(s.actual_date)}
                                    {isMakeup && (
                                      <span className={styles.badgeMakeup}>Học bù</span>
                                    )}
                                  </td>
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
                                  <td>
                                    {s.session_status !== 'completed' && !isMakeup && (
                                      alreadyHasMakeup ? (
                                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                                          Đã tạo học bù
                                        </span>
                                      ) : (
                                        <button
                                          className={styles.makeupBtn}
                                          onClick={() => openMakeupModal(s)}
                                        >
                                          Tạo học bù
                                        </button>
                                      )
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
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

      {/* ===== MODAL TẠO HỌC BÙ ===== */}
      {showMakeupModal && selectedMissedSession && (
        <div className={styles.modalOverlay} onClick={() => setShowMakeupModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Tạo buổi học bù</h3>
              <button className={styles.closeBtn} onClick={() => setShowMakeupModal(false)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.missedInfo}>
                <p><strong>Buổi nghỉ:</strong> {formatDate(selectedMissedSession.actual_date)}</p>
                <p>
                  <strong>Giờ gốc:</strong>{' '}
                  {selectedMissedSession.start_time && selectedMissedSession.end_time
                    ? `${selectedMissedSession.start_time} - ${selectedMissedSession.end_time}`
                    : '—'}
                </p>
              </div>

              <form onSubmit={handleCreateMakeup}>
                <div className={styles.formGroup}>
                  <label>Ngày bù * <span style={{ fontWeight: 400, color: '#64748b' }}>(từ ngày mai trở đi)</span></label>
                  <input
                    type="date"
                    value={makeupDate}
                    min={minMakeupDate}
                    onChange={(e) => setMakeupDate(e.target.value)}
                    className={styles.inputControl}
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Giờ bắt đầu * <span style={{ fontWeight: 400, color: '#64748b' }}>(07:00 – 21:00)</span></label>
                    <select
                      value={makeupStartTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className={styles.inputControl}
                      required
                    >
                      {START_TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Giờ kết thúc <span style={{ fontWeight: 400, color: '#64748b' }}>(tự +2 giờ)</span></label>
                    <input
                      type="text"
                      value={makeupEndTime}
                      className={styles.inputControl}
                      readOnly
                      disabled
                      style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Ghi chú</label>
                  <textarea
                    value={makeupNote}
                    onChange={(e) => setMakeupNote(e.target.value)}
                    className={styles.textarea}
                    placeholder="Ví dụ: Bù buổi nghỉ ngày 16/08 do gia sư có việc đột xuất"
                    rows={3}
                  />
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setShowMakeupModal(false)}
                    disabled={isSubmittingMakeup}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={styles.confirmBtn}
                    disabled={isSubmittingMakeup}
                  >
                    {isSubmittingMakeup ? 'Đang tạo...' : 'Xác nhận tạo buổi bù'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}