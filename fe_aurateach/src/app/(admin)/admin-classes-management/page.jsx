'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin-classes-management');
        const result = await res.json();
        if (isMounted && result.success) {
          setCourses(result.data.courses || []);
          setTutors(result.data.tutors || []);
          setUsers(result.data.users || []);
          setConfirmations(result.data.confirmations || []);
          setClassSessions(result.data.sessions || result.data.class_sessions || []);
          setStudents(result.data.students || []);
          setAttendanceRecords(result.data.session_attendance || result.data.attendance || []);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
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
    const tutor = tutors.find(t => t.tutor_id === tutorId);
    if (!tutor) return { full_name: 'N/A', email: '', phone: '' };
    const user = users.find(u => u.user_id === tutor.user_id);
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

  // Group courses: những lớp có parent_course_id → nhóm lại,
  // những lớp không có parent_course_id → mỗi lớp là 1 nhóm độc lập
  const courseGroups = useMemo(() => {
    const filtered = courses.filter(course => {
      const tutorInfo = getTutorInfo(course.tutor_id);
      const term = searchTerm.toLowerCase();
      return (
        (course.title || course.class_name)?.toLowerCase().includes(term) ||
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
          // Bỏ suffix " - Nhóm X" để lấy tên gốc
          baseTitle: (course.title || course.class_name || '').replace(/ - Nhóm \d+$/, ''),
          level: course.level,
          category_id: course.category_id,
          schedule_days: course.schedule_days,
          time_slot: course.time_slot,
          start_date: course.start_date,
          sections: [],
        };
      }
      groupMap[gid].sections.push(course);
    });

    // Sắp xếp sections trong mỗi nhóm theo course_id
    Object.values(groupMap).forEach(g => {
      g.sections.sort((a, b) => (a.course_id || '').localeCompare(b.course_id || ''));
    });

    return Object.values(groupMap).sort((a, b) => {
      const dateA = a.sections[0]?.created_at || '';
      const dateB = b.sections[0]?.created_at || '';
      return dateB.localeCompare(dateA); // mới nhất lên đầu
    });
  }, [courses, searchTerm, tutors, users]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const currentCourseSessions = selectedCourse
    ? classSessions.filter(s =>
        s.course_id === selectedCourse.course_id ||
        s.course_id === selectedCourse.id
      )
    : [];

  const currentSessionConfirmation = selectedSession
    ? confirmations.find(c =>
        c.session_id === (selectedSession.session_id || selectedSession.id) ||
        (c.course_id === selectedSession.course_id && c.lesson_number === selectedSession.session_number)
      )
    : null;

  const getCurrentSessionAttendance = () => {
    if (!selectedSession) return [];
    if (Array.isArray(selectedSession.attendance) && selectedSession.attendance.length > 0) {
      return selectedSession.attendance;
    }
    const targetId = selectedSession.session_id || selectedSession.id;
    return attendanceRecords.filter(a => a.session_id === targetId || a.class_session_id === targetId);
  };
  const currentAttendance = getCurrentSessionAttendance();

  // Tổng hợp trạng thái nhóm từ các section
  const getGroupSummary = (sections) => {
    const total = sections.length;
    const withTutor = sections.filter(s => s.tutor_id).length;
    const active = sections.filter(s => s.status === 'active').length;
    const pendingTutor = sections.filter(s => s.status === 'pending_tutor').length;
    const pendingStudent = sections.filter(s => s.status === 'pending_student').length;
    return { total, withTutor, active, pendingTutor, pendingStudent };
  };

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
        <div className={styles.loading}>Đang tải dữ liệu...</div>
      ) : courseGroups.length === 0 ? (
        <p className={styles.noData}>Không tìm thấy lớp học phù hợp.</p>
      ) : (
        <div className={styles.groupList}>
          {courseGroups.map(group => {
            const summary = getGroupSummary(group.sections);
            const isExpanded = !!expandedGroups[group.groupId];
            const isSingle = group.sections.length === 1;

            return (
              <div key={group.groupId} className={styles.groupCard}>
                {/* Group Header */}
                <div
                  className={styles.groupHeader}
                  onClick={() => !isSingle && toggleGroup(group.groupId)}
                  style={{ cursor: isSingle ? 'default' : 'pointer' }}
                >
                  <div className={styles.groupHeaderLeft}>
                    <div className={styles.groupTitleRow}>
                      <span className={styles.groupTitle}>{group.baseTitle}</span>
                      <span className={styles.groupLevel}>{group.level}</span>
                      {group.sections.length > 1 && (
                        <span className={styles.groupSectionBadge}>
                          {group.sections.length} mã lớp
                        </span>
                      )}
                    </div>
                    <div className={styles.groupMeta}>
                      <span><img src="/img/icons/online-meeting.png" alt="Lịch" className={styles.metaIcon} /> {group.schedule_days?.join(', ')}</span>
                      <span>⏰ {group.time_slot}</span>
                      <span>🗓 Bắt đầu: {formatDate(group.start_date)}</span>
                    </div>
                    {group.sections.length > 1 && (
                      <div className={styles.groupStats}>
                        {summary.active > 0 && (
                          <span className={`${styles.statPill} ${styles.statActive}`}>
                            {summary.active} đang hoạt động
                          </span>
                        )}
                        {summary.pendingTutor > 0 && (
                          <span className={`${styles.statPill} ${styles.statPendingTutor}`}>
                            {summary.pendingTutor} chờ gia sư
                          </span>
                        )}
                        {summary.pendingStudent > 0 && (
                          <span className={`${styles.statPill} ${styles.statPendingStudent}`}>
                            {summary.pendingStudent} chờ học sinh
                          </span>
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

                {/* Sections List — luôn hiển thị nếu chỉ có 1 mã lớp */}
                {(isExpanded || isSingle) && (
                  <div className={styles.sectionList}>
                    {group.sections.map((course, idx) => {
                      const tutorInfo = getTutorInfo(course.tutor_id);
                      return (
                        <div
                          key={course.id || course.course_id}
                          className={styles.sectionRow}
                          onClick={() => setSelectedCourse(course)}
                        >
                          <div className={styles.sectionIndex}>
                            {group.sections.length > 1 ? `Nhóm ${idx + 1}` : 'Lớp'}
                          </div>
                          <div className={styles.sectionInfo}>
                            <span className={styles.sectionCourseId}>
                              #{course.course_id || course.id}
                            </span>
                            <span className={styles.sectionTutor}>
                              👤 {tutorInfo.full_name}
                              {tutorInfo.email && (
                                <span className={styles.tutorEmail}> — {tutorInfo.email}</span>
                              )}
                            </span>
                            <span className={styles.sectionStudents}>
                              👥 {course.students?.length || 0}/{course.max_students} học sinh
                            </span>
                          </div>
                          <div className={styles.sectionRight}>
                            <span className={`${styles.badge} ${styles[course.status]}`}>
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
      )}

      {/* Modal chi tiết lớp & buổi học */}
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
              <p><strong>Lịch học:</strong> {selectedCourse.schedule_days?.join(', ')} ({selectedCourse.time_slot})</p>
              <p><strong>Số tuần:</strong> {selectedCourse.total_weeks || 'N/A'} tuần</p>
              <p><strong>Gia sư:</strong> {getTutorInfo(selectedCourse.tutor_id).full_name}</p>
              <p><strong>Trạng thái:</strong> {getStatusLabel(selectedCourse.status)}</p>
              <p style={{ gridColumn: '1 / -1' }}>
                <strong>Mô tả:</strong> {selectedCourse.description || <em>(Chưa có mô tả)</em>}
              </p>
              <p style={{ gridColumn: '1 / -1' }}>
                <strong>Phòng học online:</strong>{' '}
                {selectedCourse.permanent_room_url
                  ? <a href={selectedCourse.permanent_room_url} target="_blank" rel="noreferrer">{selectedCourse.permanent_room_url}</a>
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
                  return (
                    <div
                      key={session.id || session.session_id}
                      className={styles.sessionCard}
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className={styles.sessionBadge}>{displayDate || `Buổi ${session.session_number}`}</div>
                      <div className={styles.sessionTitle}>
                        {session.title || session.lesson_title || `Buổi học ${displayDate}`}
                      </div>
                      <div className={styles.sessionDate}>📅 {displayDate}</div>
                      <div className={styles.sessionTime}>⏰ {session.start_time} - {session.end_time}</div>
                      <div className={styles.sessionStatus}>
                        Trạng thái:{' '}
                        <span className={styles[session.status || session.session_status]}>
                          {(session.status || session.session_status) === 'completed' ? 'Đã hoàn thành'
                            : (session.status || session.session_status) === 'scheduled' ? 'Sắp diễn ra'
                            : (session.status || session.session_status)}
                        </span>
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
              {selectedSession.title || selectedSession.lesson_title
                ? `: ${selectedSession.title || selectedSession.lesson_title}`
                : ''}
            </h2>

            <div className={styles.sessionDetailInfo}>
              <p><strong>Ngày học:</strong> {formatDate(selectedSession.actual_date || selectedSession.session_date)}</p>
              <p><strong>Thời gian:</strong> {selectedSession.start_time} - {selectedSession.end_time}</p>
              <p>
                <strong>Trạng thái:</strong>{' '}
                {(selectedSession.status || selectedSession.session_status) === 'completed' ? 'Đã hoàn thành' : 'Sắp diễn ra'}
              </p>
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
                <p>
                  <strong>Ghi chú gia sư:</strong>{' '}
                  {currentSessionConfirmation?.note || selectedSession.tutor_note}
                </p>
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
                        record.attendance_status === true ||
                        record.status === 'present' ||
                        record.status === 'attended';
                      return (
                        <tr key={record.id || record.student_id || index}>
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
