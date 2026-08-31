"use client";
import React, { useState, useEffect, useMemo } from "react";
import { authService } from "@/services/authService";
import { courseService } from "@/services/courseService";
import { classSessionService } from "@/services/classSessionService";
import styles from './timesheet.module.css';
import Image from 'next/image';

export default function TutorTimesheetPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  
  // Trạng thái chọn tháng/năm lọc chấm công
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", 
    "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", 
    "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "0 đ";
    return Number(amount).toLocaleString("vi-VN") + " đ";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  const [expandedCourseId, setExpandedCourseId] = useState(null);
  
  const [showMakeupModal, setShowMakeupModal] = useState(false);
  const [selectedCancelledSession, setSelectedCancelledSession] = useState(null);
  const [makeupDate, setMakeupDate] = useState("");
  const [makeupStartTime, setMakeupStartTime] = useState("08:00");
  const [makeupEndTime, setMakeupEndTime] = useState("10:00");
  const [makeupNote, setMakeupNote] = useState("");
  const [isSubmittingMakeup, setIsSubmittingMakeup] = useState(false);

  const START_TIME_OPTIONS = useMemo(() => {
    const options = [];
    for (let h = 7; h <= 21; h++) {
      for (const m of [0, 30]) {
        if (h === 21 && m === 30) break;
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

  const getSessionStatusInfo = (session) => {
    // Lấy giá trị trạng thái từ trường nào mà API đang trả về
    const status = session.session_status ?? session.status;

    // Dùng dấu so sánh lỏng (==) hoặc chuyển về String/Number để bắt trọn số 5 hoặc chuỗi '5'
    if (status == 5 || status === 'completed') {
      return { label: 'Hoàn thành', type: 'completed' };
    }
    if (status == 2 || status === 'upcoming') {
      return { label: 'Sắp diễn ra', type: 'upcoming' };
    }
    if (status == 3 || status === 'ongoing') {
      return { label: 'Đang diễn ra', type: 'ongoing' };
    }
    
    // Mặc định nếu không khớp cái nào
    return { label: 'Sắp diễn ra', type: 'upcoming' };
  };

  const addTwoHours = (startTime) => {
    const [h, m] = startTime.split(':').map(Number);
    let newH = h + 2;
    if (newH > 23) newH = 23;
    return `${String(newH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
  };

  const handleStartTimeChange = (value) => {
    setMakeupStartTime(value);
    setMakeupEndTime(addTwoHours(value));
  };

  const openMakeupModal = (session) => {
    setSelectedCancelledSession(session);
    setMakeupDate("");
    setMakeupStartTime("08:00");
    setMakeupEndTime("10:00");
    setMakeupNote("");
    setShowMakeupModal(true);
  };

  const hasMakeupForSession = (sessionId) => {
    return sessions.some(s => s.original_session_id === sessionId && s.is_makeup);
  };

  const handleCreateMakeup = async (e) => {
    e.preventDefault();
    if (!selectedCancelledSession) return;

    try {
      setIsSubmittingMakeup(true);

      const courseId = selectedCancelledSession.course_id || selectedCancelledSession.courseId;
      const payload = {
        course_id: courseId,
        original_session_id: selectedCancelledSession.session_id || selectedCancelledSession.id,
        actual_date: makeupDate,
        start_time: makeupStartTime,
        end_time: makeupEndTime,
        tutor_note: makeupNote,
        is_makeup: true
      };

      if (courseService.checkScheduleConflict) {
        const conflictCheck = await courseService.checkScheduleConflict({
          tutor_id: currentUser?.user_id || currentUser?.id,
          date: makeupDate,
          start_time: makeupStartTime,
          end_time: makeupEndTime
        });
        if (conflictCheck && conflictCheck.hasConflict) {
          alert("Lịch học bị trùng với một lớp khác trong khung giờ này. Vui lòng chọn giờ khác!");
          setIsSubmittingMakeup(false);
          return;
        }
      }

      await classSessionService.createMakeupSession(payload);
      
      alert("Đã tạo buổi học bù thành công!");
      setShowMakeupModal(false);
      window.location.reload(); 

    } catch (error) {
      console.error("❌ Lỗi khi tạo buổi học bù:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra khi tạo buổi học bù. Vui lòng thử lại!");
    } finally {
      setIsSubmittingMakeup(false);
    }
  };

  useEffect(() => {
    async function loadTimesheetData() {
      try {
        setLoading(true);

        const user = await authService.getCurrentUser();
        if (!user) {
          window.location.href = "/login";
          return;
        }
        setCurrentUser(user);

        const userId = user.user_id || user.id || user._id;
        
        const res = await courseService.getTimesheetData(userId, {
          month: selectedMonth,
          year: selectedYear
        });

        const data = res?.data || res || {};
        
        setCourses(Array.isArray(data.courses) ? data.courses : []);
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);

      } catch (error) {
        console.error("❌ Lỗi khi tải dữ liệu bảng chấm công:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTimesheetData();
  }, [selectedMonth, selectedYear]);

  const courseListMap = courses.map((course) => {
    const courseId = course.id || course._id || course.course_id;
    
    const courseSessions = sessions.filter(s => {
      const sCourseId = s.course_id || s.courseId;
      if (String(sCourseId) !== String(courseId)) return false;

      if (s.actual_date) {
        const sessionDate = new Date(s.actual_date);
        const sMonth = sessionDate.getMonth() + 1;
        const sYear = sessionDate.getFullYear();
        return sMonth === Number(selectedMonth) && sYear === Number(selectedYear);
      }
      return false;
    });
    
    const completedCount = courseSessions.filter(s => {
      const status = String(s.session_status || s.status || '');
      return status === 'completed' || status === '5';
    }).length;

    const pricePerSession = course.price_per_session || course.price || 0;
    const income = completedCount * pricePerSession;

    return {
      course,
      price: pricePerSession,
      numStudents: course.students_count || course.num_students || 1,
      completedCount,
      totalSessionsInMonth: courseSessions.length,
      income,
      allSessions: courseSessions
    };
  }).filter(item => item.allSessions.length > 0);

  const totalIncome = courseListMap.reduce((acc, item) => acc + item.income, 0);
  const totalCompleted = courseListMap.reduce((acc, item) => acc + item.completedCount, 0);
  
  // Đếm số buổi bị hủy chưa tạo học bù
  const totalCancelled = courseListMap.reduce((acc, item) => {
    return acc + item.allSessions.filter(s => {
      const status = String(s.session_status || s.status || '');
      return (status === 'cancelled' || status === 'huy') && !s.is_makeup;
    }).length;
  }, 0);

  const totalHours = totalCompleted * 2;

  const monthlyData = {
    totalIncome,
    totalCompleted,
    totalCancelled,
    totalHours,
    courseList: courseListMap
  };

  if (loading) {
    return <div className="p-6 text-center">Đang tải dữ liệu bảng chấm công...</div>;
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
              <option key={idx} value={idx + 1}>{name}</option>
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
            <p className={styles.cardSub}>Đã trừ phí sàn</p>
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
            <Image src="/img/icons/warning.png" alt="Icon" width={30} height={30} />
          </div>
          <div>
            <p className={styles.cardLabel}>Buổi đã hủy</p>
            <p className={styles.cardValue}>
              {monthlyData.totalCancelled} buổi
              {monthlyData.totalCancelled > 0 && (
                <span className={styles.warningBadge}>Cần bù</span>
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
            <p className={styles.cardValue}>{monthlyData.totalHours} giờ</p>
          </div>
        </div>
      </div>

      {/* ===== DANH SÁCH LỚP ===== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Danh sách lớp học trong {monthNames[selectedMonth - 1]}/{selectedYear}
        </h2>

        {monthlyData.courseList.length === 0 ? (
          <div className={styles.emptyState}>
            Không có buổi học nào trong tháng này.
          </div>
        ) : (
          <div className={styles.courseList}>
            {monthlyData.courseList.map((item) => {
              const courseId = item.course.course_id || item.course.id || item.course._id;
              const isExpanded = expandedCourseId === courseId;

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
                    onClick={() => setExpandedCourseId(isExpanded ? null : courseId)}
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
                              const sessionId = s.session_id || s.id;
                              const isMakeup = s.is_makeup === true;
                              const alreadyHasMakeup = hasMakeupForSession(sessionId);
                              const statusInfo = getSessionStatusInfo(s);

                              return (
                                <tr key={sessionId}>
                                  <td>
                                    {formatDate(s.actual_date)}
                                    {isMakeup && <span className={styles.badgeMakeup}>Học bù</span>}
                                  </td>
                                  <td>
                                    {s.start_time && s.end_time
                                      ? `${s.start_time} - ${s.end_time}`
                                      : '—'}
                                  </td>
                                  <td>
                                    {statusInfo.type === 'completed' ? (
                                      <span className={styles.badgeCompleted}>{statusInfo.label}</span>
                                    ) : statusInfo.type === 'cancelled' ? (
                                      <span className={styles.badgeMissed}>{statusInfo.label}</span>
                                    ) : statusInfo.type === 'ongoing' ? (
                                      <span style={{ color: '#d97706', background: '#fef3c7', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                        {statusInfo.label}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#2563eb', background: '#eff6ff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                        {statusInfo.label}
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
                                    {s.tutor_note && <div className={styles.note}>{s.tutor_note}</div>}
                                  </td>
                                  <td>
                                    {statusInfo.type === 'cancelled' && !isMakeup && (
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
      {showMakeupModal && selectedCancelledSession && (
        <div className={styles.modalOverlay} onClick={() => setShowMakeupModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Tạo buổi học bù</h3>
              <button className={styles.closeBtn} onClick={() => setShowMakeupModal(false)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.missedInfo}>
                <p><strong>Buổi hủy:</strong> {formatDate(selectedCancelledSession.actual_date)}</p>
                <p>
                  <strong>Giờ gốc:</strong>{' '}
                  {selectedCancelledSession.start_time && selectedCancelledSession.end_time
                    ? `${selectedCancelledSession.start_time} - ${selectedCancelledSession.end_time}`
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
                        <option key={t} value={t}>{t}</option>
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
                    placeholder="Ví dụ: Bù buổi nghỉ do lớp bị hủy"
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