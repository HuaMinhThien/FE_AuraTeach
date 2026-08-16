'use client';

import React, { useState, useEffect } from 'react';
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
        console.error('Lỗi khi tải dữ liệu từ API Route:', error);
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

  // Hàm định dạng ngày tháng năm: DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr; // Nếu không phải ngày hợp lệ thì giữ nguyên

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Tra cứu thông tin gia sư
  const getTutorInfo = (tutorId) => {
    const tutor = tutors.find((t) => t.tutor_id === tutorId);
    if (!tutor) return { full_name: 'N/A', email: 'N/A', phone: 'N/A' };
    const user = users.find((u) => u.user_id === tutor.user_id);
    return {
      full_name: user ? user.full_name : 'Chưa cập nhật',
      email: user ? user.email : 'Chưa cập nhật',
      phone: user ? user.phone : 'Chưa cập nhật',
    };
  };

  // Tra cứu thông tin học sinh
  const getStudentInfo = (studentId) => {
    // Trường hợp studentId là user_id hoặc student_id
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

  // Lọc danh sách theo tên lớp hoặc tên gia sư
  const filteredCourses = courses.filter((course) => {
    const tutorInfo = getTutorInfo(course.tutor_id);
    const term = searchTerm.toLowerCase();
    const matchTitle = (course.title || course.class_name)?.toLowerCase().includes(term);
    const matchTutor = tutorInfo.full_name?.toLowerCase().includes(term);
    return matchTitle || matchTutor;
  });

  // Lấy danh sách các buổi học (class_sessions) thuộc khóa học đang chọn
  const currentCourseSessions = selectedCourse
    ? classSessions.filter(
        (s) =>
          s.course_id === selectedCourse.course_id ||
          s.course_id === selectedCourse.id ||
          s.course_id === selectedCourse.courseId
      )
    : [];

  // Lấy thông tin xác nhận buổi học (nếu có) tương ứng với session được chọn
  const currentSessionConfirmation = selectedSession
    ? confirmations.find(
        (c) =>
          c.session_id === (selectedSession.session_id || selectedSession.id) ||
          (c.course_id === selectedSession.course_id && c.lesson_number === selectedSession.session_number)
      )
    : null;

  // Lấy danh sách điểm danh của buổi học được chọn
  const getCurrentSessionAttendance = () => {
    if (!selectedSession) return [];
    
    // Nếu trong object session đã chứa sẵn mảng attendance
    if (Array.isArray(selectedSession.attendance) && selectedSession.attendance.length > 0) {
      return selectedSession.attendance;
    }

    // Tra cứu trong mảng attendanceRecords lấy từ API
    const targetSessionId = selectedSession.session_id || selectedSession.id;
    return attendanceRecords.filter(
      (a) => a.session_id === targetSessionId || a.class_session_id === targetSessionId
    );
  };

  const currentAttendance = getCurrentSessionAttendance();

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Quản Lý Lớp Học</h1>

      {/* Thanh tìm kiếm */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Tìm kiếm theo tên lớp hoặc tên gia sư..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Danh sách lớp học (Hiển thị các thông tin cơ bản bên ngoài) */}
      {loading ? (
        <div className={styles.loading}>Đang tải dữ liệu...</div>
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
                    <p><strong>Số học viên:</strong> {course.students?.length || 0} / {course.max_students || 'N/A'}</p>
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

      {/* Modal 1: Chi tiết lớp học & Danh sách các ô class_sessions */}
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
              <p><strong>Thời gian:</strong> {selectedCourse.start_date} {selectedCourse.end_date ? `đến ${selectedCourse.end_date}` : ''}</p>
              <p><strong>Lịch học:</strong> {selectedCourse.schedule_days?.join(', ')} ({selectedCourse.time_slot})</p>
              <p><strong>Số tuần:</strong> {selectedCourse.total_weeks || 'N/A'} tuần</p>
              <p><strong>Gia sư đảm nhận:</strong> {getTutorInfo(selectedCourse.tutor_id).full_name}</p>
              <p><strong>Mô tả:</strong> {selectedCourse.description || <em>(Chưa có mô tả)</em>}</p>
              <p><strong>Phòng học online:</strong> {selectedCourse.permanent_room_url ? (
                <a href={selectedCourse.permanent_room_url} target="_blank" rel="noreferrer">{selectedCourse.permanent_room_url}</a>
              ) : 'Chưa tạo'}</p>
            </div>

            <hr className={styles.divider} />

            <h3>Danh sách các buổi học</h3>
            <p className={styles.subHint}>Bấm vào từng buổi học bên dưới để xem thông tin chi tiết và danh sách điểm danh.</p>

            <div className={styles.sessionsGrid}>
              {currentCourseSessions.length > 0 ? (
                currentCourseSessions.map((session) => {
                  const displayDate = formatDate(session.actual_date || session.session_date);
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
                        <span className={styles[session.status || session.session_status]}>
                          {(session.status || session.session_status) === 'completed'
                            ? 'Đã hoàn thành'
                            : (session.status || session.session_status) === 'scheduled'
                            ? 'Sắp diễn ra'
                            : (session.status || session.session_status)}
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

      {/* Modal 2: Chi tiết buổi học & Bảng Xem Điểm Danh */}
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
                {(selectedSession.status || selectedSession.session_status) === 'completed'
                  ? 'Đã hoàn thành'
                  : 'Sắp diễn ra'}
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
              {/* Hiển thị thêm record_url & tutor_note trực tiếp từ class_sessions nếu có */}
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