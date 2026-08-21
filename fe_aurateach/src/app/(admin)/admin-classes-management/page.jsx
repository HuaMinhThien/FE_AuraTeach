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
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hàm chuyển đổi mã trạng thái buổi học sang chữ tiếng Việt
  const getSessionStatusLabel = (statusCode) => {
    switch (String(statusCode)) {
      case '1': return 'Chưa diễn ra';
      case '2': return 'Sắp diễn ra';
      case '3': return 'Đang diễn ra';
      case '4': return 'Đã hoàn thành';
      case 'completed': return 'Đã hoàn thành';
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
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (selectedCourse) {
      console.log("--- DEBUG SO SÁNH BUỔI HỌC ---");
      console.log("Khóa học đang chọn có ID:", selectedCourse.course_id || selectedCourse.id);
      console.log("Tổng số buổi học (classSessions) tải về từ API:", classSessions.length);
      
      if (classSessions.length > 0) {
        console.log("Mẫu course_id của buổi học đầu tiên:", classSessions[0].course_id);
        
        const matched = classSessions.filter(
          (s) =>
            s.course_id === selectedCourse.course_id ||
            s.course_id === selectedCourse.id ||
            s.course_id === selectedCourse.courseId
        );
        console.log("Số buổi học khớp sau khi lọc:", matched.length);
      }
      console.log("----------------------------------");
    }
  }, [selectedCourse]);

  const getTutorInfo = (tutorId) => {
    const tutor = tutors.find((t) => t.tutor_id === tutorId || t.id === tutorId);
    if (!tutor) return { full_name: 'N/A', email: 'N/A', phone: 'N/A' };
    const user = users.find((u) => u.user_id === tutor.user_id || u.id === tutor.user_id);
    return {
      full_name: user ? user.full_name : 'Chưa cập nhật',
      email: user ? user.email : 'Chưa cập nhật',
      phone: user ? user.phone : 'Chưa cập nhật',
    };
  };

  const getStudentInfo = (studentId) => {
    const user = users.find((u) => u.user_id === studentId);
    if (user) return { full_name: user.full_name, email: user.email, phone: user.phone };
    
    const student = students.find((s) => s.student_id === studentId || s.id === studentId);
    if (student) {
      const u = users.find((userObj) => userObj.user_id === student.user_id);
      return {
        full_name: u ? u.full_name : 'Chưa cập nhật',
        email: u ? u.email : 'Chưa cập nhật',
        phone: u ? u.phone : 'Chưa cập nhật',
      };
    }

    return { full_name: studentId || 'N/A', email: 'N/A', phone: 'N/A' };
  };

  const filteredCourses = courses.filter((course) => {
    const tutorInfo = getTutorInfo(course.tutor_id);
    const term = searchTerm.toLowerCase();
    const matchTitle = (course.title || course.class_name)?.toLowerCase().includes(term);
    const matchTutor = tutorInfo.full_name?.toLowerCase().includes(term);
    return matchTitle || matchTutor;
  });

  const currentCourseSessions = selectedCourse
    ? classSessions
        .filter(
          (s) =>
            s.course_id === selectedCourse.course_id ||
            s.course_id === selectedCourse.id ||
            s.course_id === selectedCourse.courseId
        )
        .sort((a, b) => {
          const numA = Number(a.session_number || a.lesson_number || 0);
          const numB = Number(b.session_number || b.lesson_number || 0);
          if (numA !== numB) {
            return numA - numB;
          }
          
          const dateA = new Date(a.actual_date || a.session_date || 0);
          const dateB = new Date(b.actual_date || b.session_date || 0);
          return dateA - dateB;
        })
    : [];

  const currentSessionConfirmation = selectedSession
    ? confirmations.find(
        (c) =>
          c.session_id === (selectedSession.session_id || selectedSession.id) ||
          (c.course_id === selectedSession.course_id && c.lesson_number === selectedSession.session_number)
      )
    : null;

  const getCurrentSessionAttendance = () => {
    if (!selectedSession) return [];
    if (Array.isArray(selectedSession.attendance) && selectedSession.attendance.length > 0) {
      return selectedSession.attendance;
    }
    const targetSessionId = selectedSession.session_id || selectedSession.id;
    return attendanceRecords.filter(
      (a) => a.session_id === targetSessionId || a.class_session_id === targetSessionId
    );
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
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Đang tải dữ liệu từ hệ thống...</div>
      ) : (
        <div className={styles.gridContainer}>
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => {
              const tutor = getTutorInfo(course.tutor_id);
              return (
                <div
                  key={course.id || course.course_id}
                  className={styles.courseCard}
                  onClick={() => setSelectedCourse(course)}
                >
                  <div className={styles.cardHeader}>
                    <span className={`${styles.badge} ${styles[course.status]}`}>
                      {course.status === 'active'
                        ? 'Đang hoạt động'
                        : course.status === 'closed'
                        ? 'Đã đóng'
                        : course.status === 'pending_tutor'
                        ? 'Chờ gia sư'
                        : course.status === 'pending_student'
                        ? 'Chờ học sinh'
                        : course.status}
                    </span>
                    <span className={styles.level}>{course.level}</span>
                  </div>
                  <h3 className={styles.courseTitle}>{course.title || course.class_name}</h3>
                  <div className={styles.infoGroup}>
                    <p><strong>Gia sư:</strong> {tutor.full_name}</p>
                    <p><strong>Số học viên:</strong> {course.current_students ?? course.students?.length ?? 0} / {course.max_students || 'N/A'}</p>
                  </div>
                  <div className={styles.cardFooter}>
                    <span>Bấm xem chi tiết lớp →</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className={styles.noData}>Không tìm thấy lớp học phù hợp.</p>
          )}
        </div>
      )}

      {selectedCourse && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCourse(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedCourse(null)}>
              ✕
            </button>

            <h2>{selectedCourse.title || selectedCourse.class_name}</h2>
            <div className={styles.courseDetailHeader}>
              <p><strong>Mã lớp học:</strong> {selectedCourse.course_id || selectedCourse.id}</p>
              <p><strong>Cấp độ:</strong> {selectedCourse.level}</p>
              <p><strong>Học phí:</strong> {selectedCourse.price_per_session?.toLocaleString('vi-VN')} đ/Buổi</p>
              
              <p>
                <strong>Thời gian:</strong>{' '}
                {Array.isArray(selectedCourse.schedules) && selectedCourse.schedules.length > 0 && selectedCourse.schedules[0].start_date
                  ? `${formatDate(selectedCourse.schedules[0].start_date)} - ${formatDate(selectedCourse.schedules[0].end_date)}`
                  : selectedCourse.start_date && selectedCourse.end_date
                  ? `${formatDate(selectedCourse.start_date)} - ${formatDate(selectedCourse.end_date)}`
                  : Array.isArray(selectedCourse.schedules) && selectedCourse.schedules.length > 0 && selectedCourse.schedules[0].time_slot
                  ? selectedCourse.schedules[0].time_slot
                  : 'N/A'}
              </p>

              <p>
                <strong>Lịch học:</strong>{' '}
                {Array.isArray(selectedCourse.schedules) && selectedCourse.schedules.length > 0
                  ? Array.from(new Set(selectedCourse.schedules.map(item => item.day_of_week))).join(', ')
                  : 'Chưa có lịch học'}
              </p>

              <p><strong>Số tuần:</strong> {selectedCourse.total_weeks || 'N/A'} tuần</p>
              <p><strong>Gia sư đảm nhận:</strong> {getTutorInfo(selectedCourse.tutor_id).full_name}</p>
              <p><strong>Mô tả:</strong> {selectedCourse.description || <em>(Chưa có mô tả)</em>}</p>
              
              <p><strong>Phòng học online:</strong> {
                (() => {
                  const roomUrl = selectedCourse.meeting_platform || 
                    (Array.isArray(selectedCourse.schedules) && selectedCourse.schedules.find(s => s.meeting_platform || s.room_url)?.meeting_platform || selectedCourse.schedules.find(s => s.meeting_platform || s.room_url)?.room_url);
                  
                  return roomUrl ? (
                    <a href={roomUrl.startsWith('http') ? roomUrl : `https://${roomUrl}`} target="_blank" rel="noreferrer">{roomUrl}</a>
                  ) : 'Chưa tạo';
                })()
              }</p>          
            </div>

            <hr className={styles.divider} />

            <h3>Danh sách các buổi học</h3>
            <p className={styles.subHint}>Bấm vào từng buổi học bên dưới để xem thông tin chi tiết và danh sách điểm danh.</p>

            <div className={styles.sessionsGrid}>
              {currentCourseSessions.length > 0 ? (
                currentCourseSessions.map((session) => {
                  const displayDate = formatDate(session.actual_date || session.session_date);
                  const statusCode = session.status || session.session_status;
                  return (
                    <div
                      key={session.id || session.session_id}
                      className={styles.sessionCard}
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className={styles.sessionBadge}>{displayDate || `Buổi ${session.session_number}`}</div>
                      <div className={styles.sessionTitle}>
                        {session.title || session.lesson_title || `Buổi học ngày ${displayDate}`}
                      </div>
                      <div className={styles.sessionDate}>📅 {displayDate}</div>
                      <div className={styles.sessionTime}>⏰ {session.start_time} - {session.end_time}</div>
                      <div className={styles.sessionStatus}>
                        Trạng thái:{' '}
                        <span className={styles[statusCode]}>
                          {getSessionStatusLabel(statusCode)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className={styles.noData}>Lớp học này chưa khởi tạo dữ liệu danh sách buổi học (class_sessions).</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedSession && (
        <div className={styles.modalOverlay} onClick={() => setSelectedSession(null)}>
          <div className={`${styles.modalContent} ${styles.sessionModal}`} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedSession(null)}>
              ✕
            </button>

            <h2>
              Chi Tiết Buổi Học Ngày {formatDate(selectedSession.actual_date || selectedSession.session_date)}:{' '}
              {selectedSession.title || selectedSession.lesson_title || ''}
            </h2>
            <div className={styles.sessionDetailInfo}>
              <p>
                <strong>Ngày học:</strong>{' '}
                {formatDate(selectedSession.actual_date || selectedSession.session_date)}
              </p>
              <p>
                <strong>Thời gian:</strong> {selectedSession.start_time} - {selectedSession.end_time}
              </p>
              <p>
                <strong>Trạng thái buổi học:</strong>{' '}
                {getSessionStatusLabel(selectedSession.status || selectedSession.session_status)}
              </p>
              {currentSessionConfirmation && (
                <>
                  <p>
                    <strong>Record Link:</strong>{' '}
                    {currentSessionConfirmation.record_url ? (
                      <a
                        href={
                          currentSessionConfirmation.record_url.startsWith('http')
                            ? currentSessionConfirmation.record_url
                            : `https://${currentSessionConfirmation.record_url}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {currentSessionConfirmation.record_url}
                      </a>
                    ) : (
                      <em>(Không có link record)</em>
                    )}
                  </p>
                  <p>
                    <strong>Ghi chú gia sư:</strong>{' '}
                    {currentSessionConfirmation.note || <em>(Không có ghi chú)</em>}
                  </p>
                </>
              )}
              {(selectedSession.record_url || selectedSession.tutor_note) && (
                <>
                  {selectedSession.record_url && (
                    <p>
                      <strong>Record Link:</strong>{' '}
                      <a
                        href={
                          selectedSession.record_url.startsWith('http')
                            ? selectedSession.record_url
                            : `https://${selectedSession.record_url}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selectedSession.record_url}
                      </a>
                    </p>
                  )}
                  {selectedSession.tutor_note && (
                    <p>
                      <strong>Ghi chú gia sư:</strong> {selectedSession.tutor_note}
                    </p>
                  )}
                </>
              )}
            </div>

            <hr className={styles.divider} />

            <h3>Danh Sách Điểm Danh Học Sinh</h3>
            <div className={styles.attendanceContainer}>
              {currentAttendance && currentAttendance.length > 0 ? (
                <table className={styles.attendanceTable}>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Họ và Tên Học Sinh</th>
                      <th>Email / SĐT</th>
                      <th>Trạng Thái Điểm Danh</th>
                      <th>Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAttendance.map((record, index) => {
                      const studentInfo = getStudentInfo(record.student_id || record.user_id);
                      const isPresent =
                        record.present === true ||
                        record.attendance_status === true ||
                        record.status === 'present' ||
                        record.status === 'attended';

                      return (
                        <tr key={record.id || record.student_id || index}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{studentInfo.full_name}</strong>
                          </td>
                          <td>
                            {studentInfo.email} <br /> <small>{studentInfo.phone}</small>
                          </td>
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
                <p className={styles.noData}>Chưa có dữ liệu điểm danh cho buổi học này.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}