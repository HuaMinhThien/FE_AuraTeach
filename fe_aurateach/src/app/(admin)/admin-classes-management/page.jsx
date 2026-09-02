'use client';

import React, { useState, useEffect } from 'react';
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

  const getSessionStatusLabel = (statusCode) => {
    switch (String(statusCode)) {
      case '1': return 'Chưa diễn ra';
      case '2': return 'Sắp diễn ra';
      case '3': return 'Đang diễn ra';
      case '4': return 'Chờ xác nhận';
      case '5': return 'Đã hoàn thành';
      case '6': return 'Quá hạn';
      case 'completed': return 'Đã hoàn thành';
      case 'uncompleted': return 'Chưa hoàn thành';
      case 'scheduled': return 'Sắp diễn ra';
      default: return statusCode || 'N/A';
    }
  };

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
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const getTutorInfo = (tutorId) => {
    const tutor = tutors.find(t => t.tutor_id === tutorId || t.id === tutorId);
    if (!tutor) return { full_name: 'N/A', email: 'N/A', phone: 'N/A' };
    const user = users.find(u => u.user_id === tutor.user_id || u.id === tutor.user_id);
    return {
      full_name: user?.full_name || 'Chưa cập nhật',
      email: user?.email || 'Chưa cập nhật',
      phone: user?.phone || 'Chưa cập nhật',
    };
  };

  const getStudentInfo = (studentId) => {
    const user = users.find(u => u.user_id === studentId);
    if (user) return { full_name: user.full_name, email: user.email, phone: user.phone };
    const student = students.find(s => s.student_id === studentId || s.id === studentId);
    if (student) {
      const u = users.find(userObj => userObj.user_id === student.user_id);
      return { full_name: u?.full_name || 'Chưa cập nhật', email: u?.email || 'N/A', phone: u?.phone || 'N/A' };
    }
    return { full_name: studentId || 'N/A', email: 'N/A', phone: 'N/A' };
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Đang hoạt động';
      case 'closed': return 'Đã đóng';
      case 'pending_tutor': return 'Chờ gia sư';
      case 'pending_student': return 'Chờ học sinh';
      case 'cancelled': return 'Đã hủy';
      default: return status || 'N/A';
    }
  };

  // Nhóm courses theo title (tên lớp gốc)
  const filteredCourses = courses.filter(course => {
    const tutor = getTutorInfo(course.tutor_id);
    const term = searchTerm.toLowerCase();
    return (course.title || course.class_name || '').toLowerCase().includes(term)
      || tutor.full_name.toLowerCase().includes(term);
  });

  // Group by title
  const grouped = filteredCourses.reduce((acc, course) => {
    const key = course.title || course.class_name || course.course_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(course);
    return acc;
  }, {});

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentCourseSessions = selectedCourse
    ? classSessions
        .filter(s =>
          s.course_id === selectedCourse.course_id ||
          s.course_id === selectedCourse.id
        )
        .sort((a, b) => {
          const dateA = new Date(a.actual_date || 0);
          const dateB = new Date(b.actual_date || 0);
          return dateA - dateB;
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
    if (Array.isArray(selectedSession.attendance) && selectedSession.attendance.length > 0)
      return selectedSession.attendance;
    const sessionId = selectedSession.session_id || null;
    const dbId = selectedSession.id || null;
    return attendanceRecords.filter(a => {
      const attId = a.session_id || a.class_session_id || '';
      if (sessionId && attId === sessionId) return true;
      if (dbId && attId === dbId) return true;
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
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Đang tải dữ liệu từ hệ thống...</div>
      ) : (
        <div className={styles.groupList}>
          {Object.keys(grouped).length === 0 ? (
            <p className={styles.noData}>Không tìm thấy lớp học phù hợp.</p>
          ) : (
            Object.entries(grouped).map(([groupTitle, groupCourses]) => {
              const isExpanded = expandedGroups[groupTitle] !== false; // mặc định mở
              const sampleCourse = groupCourses[0];
              const activeCount = groupCourses.filter(c => c.status === 'active').length;
              const pendingTutorCount = groupCourses.filter(c => c.status === 'pending_tutor').length;
              const pendingStudentCount = groupCourses.filter(c => c.status === 'pending_student').length;

              return (
                <div key={groupTitle} className={styles.groupCard}>
                  {/* Group Header — click để expand/collapse */}
                  <div className={styles.groupHeader} onClick={() => toggleGroup(groupTitle)}>
                    <div className={styles.groupHeaderLeft}>
                      <div className={styles.groupTitleRow}>
                        <span className={styles.groupTitle}>{groupTitle}</span>
                        {sampleCourse.level && (
                          <span className={styles.groupLevel}>{sampleCourse.level}</span>
                        )}
                        <span className={styles.groupSectionBadge}>{groupCourses.length} lớp</span>
                      </div>
                      <div className={styles.groupMeta}>
                        <span>📚 {sampleCourse.category_name || 'Chưa phân loại'}</span>
                        <span>💰 {sampleCourse.price_per_session?.toLocaleString('vi-VN') || 0}đ/buổi</span>
                      </div>
                      <div className={styles.groupStats}>
                        {activeCount > 0 && (
                          <span className={`${styles.statPill} ${styles.statActive}`}>{activeCount} đang hoạt động</span>
                        )}
                        {pendingTutorCount > 0 && (
                          <span className={`${styles.statPill} ${styles.statPendingTutor}`}>{pendingTutorCount} chờ gia sư</span>
                        )}
                        {pendingStudentCount > 0 && (
                          <span className={`${styles.statPill} ${styles.statPendingStudent}`}>{pendingStudentCount} chờ học sinh</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.groupToggle}>
                      <span className={isExpanded ? styles.arrowUp : styles.arrowDown}>▾</span>
                    </div>
                  </div>

                  {/* Section rows */}
                  {isExpanded && (
                    <div className={styles.sectionList}>
                      {groupCourses.map((course, idx) => {
                        const tutor = getTutorInfo(course.tutor_id);
                        return (
                          <div
                            key={course.course_id || course.id}
                            className={styles.sectionRow}
                            onClick={() => setSelectedCourse(course)}
                          >
                            <div className={styles.sectionIndex}>Lớp {idx + 1}</div>

                            <div className={styles.sectionInfo}>
                              <span className={styles.sectionCourseId}>{course.course_id || course.id}</span>
                              <span className={styles.sectionTutor}>
                                {tutor.full_name}
                                <span className={styles.tutorEmail}> — {tutor.email}</span>
                              </span>
                              <span className={styles.sectionStudents}>
                                👥 {course.current_students ?? course.students?.length ?? 0} / {course.max_students || '?'} học viên
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
            })
          )}
        </div>
      )}

      {/* Modal chi tiết lớp */}
      {selectedCourse && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCourse(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedCourse(null)}>✕</button>
            <h2>{selectedCourse.title || selectedCourse.class_name}</h2>

            <div className={styles.courseDetailHeader}>
              <p><strong>Mã lớp:</strong> {selectedCourse.course_id || selectedCourse.id}</p>
              <p><strong>Cấp độ:</strong> {selectedCourse.level || 'N/A'}</p>
              <p><strong>Học phí:</strong> {selectedCourse.price_per_session?.toLocaleString('vi-VN')}đ/buổi</p>
              <p><strong>Số tuần:</strong> {selectedCourse.total_weeks || 'N/A'}</p>
              <p><strong>Gia sư:</strong> {getTutorInfo(selectedCourse.tutor_id).full_name}</p>
              <p>
                <strong>Thời gian:</strong>{' '}
                {selectedCourse.start_date && selectedCourse.end_date
                  ? `${formatDate(selectedCourse.start_date)} - ${formatDate(selectedCourse.end_date)}`
                  : Array.isArray(selectedCourse.schedules) && selectedCourse.schedules.length > 0
                    ? `${formatDate(selectedCourse.schedules[0].start_date)} - ${formatDate(selectedCourse.schedules[0].end_date)}`
                    : 'N/A'}
              </p>
              <p>
                <strong>Lịch học:</strong>{' '}
                {Array.isArray(selectedCourse.schedules) && selectedCourse.schedules.length > 0
                  ? Array.from(new Set(selectedCourse.schedules.map(s => s.day_of_week))).join(', ')
                  : 'Chưa có lịch'}
              </p>
              <p><strong>Mô tả:</strong> {selectedCourse.description || '(Chưa có)'}</p>
            </div>

            <hr className={styles.divider} />
            <h3>Danh sách các buổi học</h3>
            <p className={styles.subHint}>Bấm vào từng buổi để xem chi tiết và điểm danh.</p>

            <div className={styles.sessionsGrid}>
              {currentCourseSessions.length > 0 ? (
                currentCourseSessions.map(session => {
                  const displayDate = formatDate(session.actual_date || session.session_date);
                  const isMakeup = session.is_makeup === true || (session.lesson_title || '').toLowerCase().includes('học bù');
                  const statusCode = session.session_status || session.status;
                  return (
                    <div
                      key={session.session_id || session.id}
                      className={styles.sessionCard}
                      onClick={() => setSelectedSession(session)}
                      style={isMakeup ? { borderLeft: '4px solid #ea580c' } : {}}
                    >
                      <div className={styles.sessionBadge}>
                        {displayDate}
                        {isMakeup && (
                          <span style={{ marginLeft: 6, background: '#ffedd5', color: '#c2410c', fontSize: 10, fontWeight: 600, borderRadius: 999, padding: '1px 6px' }}>
                            Học bù
                          </span>
                        )}
                      </div>
                      <div className={styles.sessionTitle}>
                        {session.lesson_title || `Buổi học ngày ${displayDate}`}
                      </div>
                      <div className={styles.sessionDate}>📅 {displayDate}</div>
                      <div className={styles.sessionTime}>⏰ {session.start_time} - {session.end_time}</div>
                      <div className={styles.sessionStatus}>
                        Trạng thái: <span className={styles[statusCode]}>{getSessionStatusLabel(statusCode)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className={styles.noData}>Lớp chưa có dữ liệu buổi học.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết buổi học */}
      {selectedSession && (
        <div className={styles.modalOverlay} onClick={() => setSelectedSession(null)}>
          <div className={`${styles.modalContent} ${styles.sessionModal}`} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedSession(null)}>✕</button>

            <h2>
              Chi Tiết Buổi Học — {formatDate(selectedSession.actual_date || selectedSession.session_date)}
              {(selectedSession.lesson_title || '').toLowerCase().includes('học bù') && (
                <span style={{ marginLeft: 10, padding: '3px 10px', background: '#ffedd5', color: '#c2410c', fontSize: 13, fontWeight: 600, borderRadius: 999 }}>
                  Học bù
                </span>
              )}
            </h2>

            <div className={styles.sessionDetailInfo}>
              <p><strong>Ngày học:</strong> {formatDate(selectedSession.actual_date || selectedSession.session_date)}</p>
              <p><strong>Thời gian:</strong> {selectedSession.start_time} - {selectedSession.end_time}</p>
              <p><strong>Trạng thái:</strong> {getSessionStatusLabel(selectedSession.session_status || selectedSession.status)}</p>
              {(currentSessionConfirmation?.record_url || selectedSession.record_url) && (
                <p>
                  <strong>Record:</strong>{' '}
                  <a href={currentSessionConfirmation?.record_url || selectedSession.record_url} target="_blank" rel="noreferrer">
                    Xem record
                  </a>
                </p>
              )}
              {(currentSessionConfirmation?.note || selectedSession.tutor_note) && (
                <p><strong>Ghi chú:</strong> {currentSessionConfirmation?.note || selectedSession.tutor_note}</p>
              )}
            </div>

            <hr className={styles.divider} />
            <h3>Danh Sách Điểm Danh Học Sinh</h3>

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
                        record.attendance_status === true ||
                        record.status === 'present' ||
                        record.status === 'attended';
                      return (
                        <tr key={record.attendance_id || record.id || index}>
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
                <p className={styles.noData}>Chưa có dữ liệu điểm danh.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
