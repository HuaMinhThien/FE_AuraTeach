'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '@/services/adminService';
import styles from './AdminClassesManagement.module.css';

export default function AdminClassesManagement() {
  const [courses, setCourses] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [users, setUsers] = useState([]);
  const [confirmations, setConfirmations] = useState([]);
  const [classSessions, setClassSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const response = await adminService.getClassesManagementData();
        const resultData = response.data !== undefined ? response.data : response;
        if (isMounted && (resultData.success || resultData)) {
          const payload = resultData.data || resultData;
          setCourses(payload.courses || []);
          setTutors(payload.tutors || []);
          setUsers(payload.users || []);
          setConfirmations(payload.confirmations || []);
          setClassSessions(payload.sessions || payload.class_sessions || []);
          setStudents(payload.students || []);
          setAttendanceRecords(payload.session_attendance || payload.attendance || []);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu từ Backend:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getTutorInfo = (tutorId) => {
    if (!tutorId) return { full_name: 'Chưa có gia sư', email: '', phone: '' };
    const tutor = tutors.find(t => t.tutor_id === tutorId || t.id === tutorId);
    if (!tutor) return { full_name: 'N/A', email: '', phone: '' };
    const user = users.find(u => u.user_id === tutor.user_id || u.id === tutor.user_id);
    return {
      full_name: user?.full_name || 'Chưa cập nhật',
      email: user?.email || '',
      phone: user?.phone || '',
    };
  };

  const getStudentInfo = (studentId) => {
    const user = users.find(u => u.user_id === studentId);
    if (user) return { full_name: user.full_name, email: user.email, phone: user.phone };
    const student = students.find(s => s.student_id === studentId || s.id === studentId);
    if (student) {
      const u = users.find(u => u.user_id === student.user_id);
      return { full_name: u?.full_name || 'N/A', email: u?.email || '', phone: u?.phone || '' };
    }
    return { full_name: studentId || 'N/A', email: '', phone: '' };
  };

  const getStatusLabel = (status) => {
    const map = {
      active: 'Đang hoạt động',
      closed: 'Đã đóng',
      pending_tutor: 'Chờ gia sư',
      pending_student: 'Chờ học sinh',
      cancelled: 'Đã huỷ',
      completed: 'Hoàn thành',
    };
    return map[status] || status;
  };

  // ✅ Hàm badge màu sắc cho trạng thái buổi học
  const getStatusBadge = (status, isMakeup, isLive) => {
    if (isMakeup) {
      return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#ffedd5', color: '#c2410c', fontWeight: 600 }}>Học bù</span>;
    }
    if (isLive) {
      return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#dc3545', color: '#fff', fontWeight: 600 }}>Đang diễn ra</span>;
    }
    switch (String(status)) {
      case '1': return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#6c757d', color: '#fff' }}>Chưa diễn ra</span>;
      case '2': return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#0dcaf0', color: '#000' }}>Sắp diễn ra</span>;
      case '3': return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#198754', color: '#fff' }}>Đang diễn ra</span>;
      case '4': return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#ffc107', color: '#000' }}>Chờ xác nhận</span>;
      case '5': return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#0d6efd', color: '#fff' }}>Đã hoàn thành</span>;
      case '6': return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#dc2626', color: '#fff', fontWeight: 600 }}>Quá hạn</span>;
      case 'completed': return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#0d6efd', color: '#fff' }}>Đã hoàn thành</span>;
      case 'scheduled': return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#0dcaf0', color: '#000' }}>Sắp diễn ra</span>;
      case 'uncompleted': return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#6c757d', color: '#fff' }}>Chưa hoàn thành</span>;
      default: return <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#e2e8f0', color: '#475569' }}>{status || 'N/A'}</span>;
    }
  };

  // Group theo parent_course_id
  const courseGroups = useMemo(() => {
    const filtered = courses.filter(course => {
      const tutorInfo = getTutorInfo(course.tutor_id);
      const term = searchTerm.toLowerCase();
      return (
        (course.title || course.class_name || '').toLowerCase().includes(term) ||
        tutorInfo.full_name?.toLowerCase().includes(term)
      );
    });

    const groupMap = {};
    filtered.forEach(course => {
      const gid = course.parent_course_id || course.course_id || course.id;
      if (!groupMap[gid]) {
        groupMap[gid] = {
          groupId: gid,
          title: course.title || course.class_name || '',
          baseTitle: (course.title || course.class_name || '').replace(/ - Nhóm \d+$/, ''),
          level: course.level,
          schedule_days: course.schedule_days,
          time_slot: course.time_slot,
          start_date: course.start_date,
          sections: [],
        };
      }
      groupMap[gid].sections.push(course);
    });

    Object.values(groupMap).forEach(g => {
      g.sections.sort((a, b) => (a.course_id || '').localeCompare(b.course_id || ''));
    });

    return Object.values(groupMap).sort((a, b) => {
      const dateA = a.sections[0]?.created_at || '';
      const dateB = b.sections[0]?.created_at || '';
      return dateB.localeCompare(dateA);
    });
  }, [courses, searchTerm, tutors, users]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const getGroupSummary = (sections) => ({
    total: sections.length,
    withTutor: sections.filter(s => s.tutor_id).length,
    active: sections.filter(s => s.status === 'active').length,
    pendingTutor: sections.filter(s => s.status === 'pending_tutor').length,
    pendingStudent: sections.filter(s => s.status === 'pending_student').length,
  });

  const currentCourseSessions = selectedCourse
    ? classSessions
        .filter(s => s.course_id === selectedCourse.course_id || s.course_id === selectedCourse.id)
        .sort((a, b) => {
          const numA = Number(a.session_number || a.lesson_number || 0);
          const numB = Number(b.session_number || b.lesson_number || 0);
          if (numA !== numB) return numA - numB;
          return new Date(a.actual_date || a.session_date || 0) - new Date(b.actual_date || b.session_date || 0);
        })
    : [];

  const currentSessionConfirmation = selectedSession
    ? confirmations.find(c =>
        c.session_id === (selectedSession.session_id || selectedSession.id) ||
        (c.course_id === selectedSession.course_id && c.lesson_number === selectedSession.session_number)
      )
    : null;

  const getCurrentSessionAttendance = () => {
    if (!selectedSession) return [];
    // BE giờ eager load attendances vào từng session
    if (Array.isArray(selectedSession.attendances) && selectedSession.attendances.length > 0) {
      return selectedSession.attendances;
    }
    // Fallback: tìm trong attendanceRecords rời rạc (tương thích data cũ)
    if (Array.isArray(selectedSession.attendance) && selectedSession.attendance.length > 0) {
      return selectedSession.attendance;
    }
    const sessionId = selectedSession.session_id || null;
    const dbId = selectedSession.id || null;
    return attendanceRecords.filter(a => {
      const attId = a.session_id || a.class_session_id || '';
      if (sessionId && attId === sessionId) return true;
      if (dbId && attId === dbId) return true;
      if (sessionId && String(attId).includes(String(sessionId))) return true;
      if (sessionId && String(sessionId).includes(String(attId)) && attId) return true;
      return false;
    });
  };

  const currentAttendance = getCurrentSessionAttendance();

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Quản Lý Lớp Học</h1>

      <div className={styles.searchContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Tìm kiếm theo tên lớp hoặc tên gia sư..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Đang tải dữ liệu...</div>
      ) : courseGroups.length === 0 ? (
        <p className={styles.noData}>Không tìm thấy lớp học phù hợp.</p>
      ) : (
        <>
          {/* Thông tin phân trang */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, fontSize: 14, color: '#64748b' }}>
            <span>
              Hiển thị <strong>{Math.min((currentPage - 1) * PAGE_SIZE + 1, courseGroups.length)}</strong> –{' '}
              <strong>{Math.min(currentPage * PAGE_SIZE, courseGroups.length)}</strong> / <strong>{courseGroups.length}</strong> lớp
            </span>
          </div>

          <div className={styles.groupList}>
            {courseGroups
              .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
              .map(group => {
            const summary = getGroupSummary(group.sections);
            const isExpanded = !!expandedGroups[group.groupId];
            const isSingle = group.sections.length === 1;

            const scheduleDaysArr = Array.isArray(group.schedule_days)
              ? group.schedule_days
              : typeof group.schedule_days === 'string'
                ? (() => { try { return JSON.parse(group.schedule_days); } catch { return group.schedule_days ? [group.schedule_days] : []; } })()
                : [];

            return (
              <div key={group.groupId} className={styles.groupCard}>
                <div
                  className={styles.groupHeader}
                  onClick={() => !isSingle && toggleGroup(group.groupId)}
                  style={{ cursor: isSingle ? 'default' : 'pointer' }}
                >
                  <div className={styles.groupHeaderLeft}>
                    <div className={styles.groupTitleRow}>
                      <span className={styles.groupTitle}>{group.baseTitle || group.title}</span>
                      {group.level && <span className={styles.groupLevel}>{group.level}</span>}
                      {group.sections.length > 1 && (
                        <span className={styles.groupSectionBadge}>{group.sections.length} mã lớp</span>
                      )}
                    </div>
                    <div className={styles.groupMeta}>
                      {scheduleDaysArr.length > 0 && <span>📅 {scheduleDaysArr.join(', ')}</span>}
                      {group.time_slot && <span>⏰ {group.time_slot}</span>}
                      {group.start_date && <span>🗓 Bắt đầu: {formatDate(group.start_date)}</span>}
                    </div>
                    {group.sections.length > 1 && (
                      <div className={styles.groupStats}>
                        {summary.active > 0 && (
                          <span className={`${styles.statPill} ${styles.statActive}`}>{summary.active} đang hoạt động</span>
                        )}
                        {summary.pendingTutor > 0 && (
                          <span className={`${styles.statPill} ${styles.statPendingTutor}`}>{summary.pendingTutor} chờ gia sư</span>
                        )}
                        {summary.pendingStudent > 0 && (
                          <span className={`${styles.statPill} ${styles.statPendingStudent}`}>{summary.pendingStudent} chờ học sinh</span>
                        )}
                        <span className={`${styles.statPill} ${styles.statNeutral}`}>
                          {summary.withTutor}/{summary.total} có gia sư
                        </span>
                      </div>
                    )}
                  </div>
                  {!isSingle && (
                    <div className={styles.groupToggle}>
                      <span className={isExpanded ? styles.arrowUp : styles.arrowDown}>▾</span>
                    </div>
                  )}
                </div>

                {(isExpanded || isSingle) && (
                  <div className={styles.sectionList}>
                    {group.sections.map((course, idx) => {
                      const tutorInfo = getTutorInfo(course.tutor_id);
                      return (
                        <div
                          key={course.id || course.course_id || idx}
                          className={styles.sectionRow}
                          onClick={() => setSelectedCourse(course)}
                        >
                          <div className={styles.sectionIndex}>
                            {group.sections.length > 1 ? `Nhóm ${idx + 1}` : 'Lớp'}
                          </div>
                          <div className={styles.sectionInfo}>
                            <span className={styles.sectionCourseId}>#{course.course_id || course.id}</span>
                            <span className={styles.sectionTutor}>
                              👤 {tutorInfo.full_name}
                              {tutorInfo.email && <span className={styles.tutorEmail}> — {tutorInfo.email}</span>}
                            </span>
                            <span className={styles.sectionStudents}>
                              👥 {course.students?.length || course.current_students || 0}/{course.max_students} học sinh
                            </span>
                          </div>
                          <div className={styles.sectionRight}>
                            <span className={`${styles.badge} ${styles[course.status] || ''}`}>
                              {getStatusLabel(course.status)}
                            </span>
                            <span className={styles.sectionViewLink}>Xem chi tiết →</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          </div>

          {/* Pagination controls */}
          {courseGroups.length > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0',
                  background: currentPage === 1 ? '#f1f5f9' : '#fff',
                  color: currentPage === 1 ? '#94a3b8' : '#334155',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 500
                }}
              >
                ← Trước
              </button>

              {Array.from({ length: Math.ceil(courseGroups.length / PAGE_SIZE) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid',
                    borderColor: page === currentPage ? '#2563eb' : '#e2e8f0',
                    background: page === currentPage ? '#2563eb' : '#fff',
                    color: page === currentPage ? '#fff' : '#334155',
                    fontWeight: page === currentPage ? 700 : 400,
                    cursor: 'pointer', minWidth: 36
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(courseGroups.length / PAGE_SIZE)))}
                disabled={currentPage === Math.ceil(courseGroups.length / PAGE_SIZE)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0',
                  background: currentPage === Math.ceil(courseGroups.length / PAGE_SIZE) ? '#f1f5f9' : '#fff',
                  color: currentPage === Math.ceil(courseGroups.length / PAGE_SIZE) ? '#94a3b8' : '#334155',
                  cursor: currentPage === Math.ceil(courseGroups.length / PAGE_SIZE) ? 'not-allowed' : 'pointer', fontWeight: 500
                }}
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal chi tiết lớp học */}
      {selectedCourse && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCourse(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedCourse(null)}>✕</button>
            <h2>{selectedCourse.title || selectedCourse.class_name}</h2>
            <div className={styles.courseDetailHeader}>
              <p><strong>Mã lớp:</strong> {selectedCourse.course_id || selectedCourse.id}</p>
              <p><strong>Cấp độ:</strong> {selectedCourse.level}</p>
              <p><strong>Học phí:</strong> {selectedCourse.price_per_session?.toLocaleString('vi-VN')} đ/buổi</p>
              <p><strong>Ngày bắt đầu:</strong> {formatDate(selectedCourse.start_date)}</p>
              <p>
                <strong>Lịch học:</strong>{' '}
                {(() => {
                  const days = selectedCourse.schedule_days;
                  if (Array.isArray(days)) return days.join(', ');
                  if (typeof days === 'string') { try { return JSON.parse(days).join(', '); } catch { return days; } }
                  return 'N/A';
                })()}
                {selectedCourse.time_slot ? ` (${selectedCourse.time_slot})` : ''}
              </p>
              <p><strong>Số tuần:</strong> {selectedCourse.total_weeks || 'N/A'} tuần</p>
              <p><strong>Gia sư:</strong> {getTutorInfo(selectedCourse.tutor_id).full_name}</p>
              <p><strong>Trạng thái:</strong> {getStatusLabel(selectedCourse.status)}</p>
              <p style={{ gridColumn: '1 / -1' }}>
                <strong>Mô tả:</strong> {selectedCourse.description || <em>(Chưa có mô tả)</em>}
              </p>
              <p style={{ gridColumn: '1 / -1' }}>
                <strong>Phòng học online:</strong>{' '}
                {(selectedCourse.meet_link || selectedCourse.permanent_room_url)
                  ? <a href={selectedCourse.meet_link || selectedCourse.permanent_room_url} target="_blank" rel="noreferrer">{selectedCourse.meet_link || selectedCourse.permanent_room_url}</a>
                  : 'Chưa tạo'}
              </p>
            </div>

            <hr className={styles.divider} />
            <h3>Danh sách các buổi học</h3>
            <p className={styles.subHint}>Bấm vào từng buổi học để xem chi tiết và điểm danh.</p>

            <div className={styles.sessionsGrid}>
              {currentCourseSessions.length > 0 ? (
                currentCourseSessions.map(session => {
                  const displayDate = formatDate(session.actual_date || session.session_date);
                  const isMakeup = session.is_makeup === true
                    || (session.lesson_title || '').toLowerCase().includes('học bù');
                  const statusCode = String(session.session_status || session.status || '');
                  const now = new Date();
                  const sessionDate = session.actual_date ? new Date(session.actual_date) : null;
                  const isToday = sessionDate ? sessionDate.toDateString() === now.toDateString() : false;
                  const isLive = isToday && statusCode === '3';

                  return (
                    <div
                      key={session.id || session.session_id}
                      className={styles.sessionCard}
                      onClick={() => setSelectedSession(session)}
                      style={isMakeup ? { borderLeft: '4px solid #ea580c' } : {}}
                    >
                      <div className={styles.sessionBadge}>
                        {displayDate || `Buổi ${session.session_number}`}
                      </div>
                      <div className={styles.sessionTitle}>
                        {session.title || session.lesson_title || `Buổi học ${displayDate}`}
                      </div>
                      <div className={styles.sessionDate}>📅 {displayDate}</div>
                      <div className={styles.sessionTime}>⏰ {session.start_time} - {session.end_time}</div>
                      <div className={styles.sessionStatus} style={{ marginTop: 8 }}>
                        {getStatusBadge(statusCode, isMakeup, isLive)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className={styles.noData}>Lớp học này chưa khởi tạo dữ liệu buổi học.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết buổi học & điểm danh */}
      {selectedSession && (
        <div className={styles.modalOverlay} onClick={() => setSelectedSession(null)}>
          <div className={`${styles.modalContent} ${styles.sessionModal}`} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedSession(null)}>✕</button>
            <h2>
              Chi Tiết Buổi Học — {formatDate(selectedSession.actual_date || selectedSession.session_date)}
              {selectedSession.is_makeup && (
                <span style={{ marginLeft: 10, padding: '3px 10px', background: '#ffedd5', color: '#c2410c', fontSize: 13, fontWeight: 600, borderRadius: 999 }}>
                  Học bù
                </span>
              )}
              {(selectedSession.title || selectedSession.lesson_title)
                ? `: ${selectedSession.title || selectedSession.lesson_title}`
                : ''}
            </h2>

            <div className={styles.sessionDetailInfo}>
              <p><strong>Ngày học:</strong> {formatDate(selectedSession.actual_date || selectedSession.session_date)}</p>
              <p><strong>Thời gian:</strong> {selectedSession.start_time} - {selectedSession.end_time}</p>
              <p>
                <strong>Trạng thái:</strong>{' '}
                {getStatusBadge(
                  String(selectedSession.session_status || selectedSession.status || ''),
                  selectedSession.is_makeup === true || (selectedSession.lesson_title || '').toLowerCase().includes('học bù'),
                  false
                )}
              </p>
              {selectedSession.is_makeup && selectedSession.makeup_for_session_id && (
                <p><strong>Bù cho buổi:</strong> {selectedSession.makeup_for_session_id}</p>
              )}
              {(currentSessionConfirmation?.record_url || selectedSession.record_url) && (
                <p>
                  <strong>Record Link:</strong>{' '}
                  <a
                    href={(currentSessionConfirmation?.record_url || selectedSession.record_url).startsWith('http')
                      ? (currentSessionConfirmation?.record_url || selectedSession.record_url)
                      : `https://${currentSessionConfirmation?.record_url || selectedSession.record_url}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {currentSessionConfirmation?.record_url || selectedSession.record_url}
                  </a>
                </p>
              )}
              {(currentSessionConfirmation?.note || selectedSession.tutor_note) && (
                <p><strong>Ghi chú gia sư:</strong> {currentSessionConfirmation?.note || selectedSession.tutor_note}</p>
              )}
            </div>

            <hr className={styles.divider} />
            <h3>Danh Sách Điểm Danh</h3>

            <div className={styles.attendanceContainer}>
              {currentAttendance.length > 0 ? (
                <table className={styles.attendanceTable}>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Họ và Tên</th>
                      <th>Email / SĐT</th>
                      <th>Điểm danh</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAttendance.map((record, index) => {
                      const info = getStudentInfo(record.student_id || record.user_id);
                      const isPresent =
                        record.present === true ||
                        String(record.attendance_status || '').toLowerCase() === 'present' ||
                        String(record.attendance_status || '').toLowerCase() === 'attended' ||
                        record.attendance_status === true ||
                        String(record.status || '').toLowerCase() === 'present' ||
                        String(record.status || '').toLowerCase() === 'attended';
                      return (
                        <tr key={record.id || record.attendance_id || record.student_id || index}>
                          <td>{index + 1}</td>
                          <td><strong>{info.full_name}</strong></td>
                          <td>{info.email}<br /><small>{info.phone}</small></td>
                          <td>
                            <span className={isPresent ? styles.presentBadge : styles.absentBadge}>
                              {isPresent ? 'Có mặt' : 'Vắng mặt'}
                            </span>
                          </td>
                          <td>{record.note || record.tutor_comment || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className={styles.noData}>
                  Chưa có dữ liệu điểm danh.
                  {selectedSession.is_makeup && (
                    <span style={{ display: 'block', marginTop: 6, color: '#94a3b8', fontSize: 13 }}>
                      (Buổi học bù — điểm danh chỉ có sau khi gia sư xác nhận hoàn thành)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
