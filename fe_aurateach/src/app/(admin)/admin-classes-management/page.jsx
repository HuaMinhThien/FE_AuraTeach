'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminClassesManagement.module.css';

export default function AdminClassesManagement() {
  const [courses, setCourses] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [users, setUsers] = useState([]);
  const [confirmations, setConfirmations] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  // Đã bật sẵn loading true từ đầu
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

  // Lọc danh sách theo tên lớp hoặc tên gia sư
  const filteredCourses = courses.filter((course) => {
    const tutorInfo = getTutorInfo(course.tutor_id);
    const term = searchTerm.toLowerCase();
    const matchTitle = course.title?.toLowerCase().includes(term);
    const matchTutor = tutorInfo.full_name?.toLowerCase().includes(term);
    return matchTitle || matchTutor;
  });

  // Lấy các xác nhận buổi học thuộc về khóa học đang chọn
  const currentCourseConfirmations = selectedCourse
    ? confirmations.filter((c) => c.course_id === selectedCourse.course_id)
    : [];

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

      {/* Danh sách lớp học */}
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
                      {course.status === 'active' ? 'Đang hoạt động' : 'Đã đóng'}
                    </span>
                    <span className={styles.level}>{course.level}</span>
                  </div>
                  <h3 className={styles.courseTitle}>{course.title}</h3>
                  <div className={styles.infoGroup}>
                    <p><strong>Gia sư:</strong> {tutor.full_name}</p>
                    <p><strong>Email:</strong> {tutor.email}</p>
                    <p><strong>SĐT:</strong> {tutor.phone}</p>
                  </div>
                  <div className={styles.cardFooter}>
                    <span>Nhấp để xem chi tiết →</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className={styles.noData}>Không tìm thấy lớp học phù hợp.</p>
          )}
        </div>
      )}

      {/* Modal chi tiết lớp học & danh sách buổi học hoàn thành */}
      {selectedCourse && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCourse(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedCourse(null)}>
              ✕
            </button>

            <h2>{selectedCourse.title}</h2>
            <div className={styles.courseDetailHeader}>
              <p><strong>Cấp độ:</strong> {selectedCourse.level}</p>
              <p><strong>Học phí:</strong> {selectedCourse.price_per_session?.toLocaleString()} đ/Buổi</p>
              <p><strong>Lịch học:</strong> {selectedCourse.schedule_days?.join(', ')} ({selectedCourse.time_slot})</p>
              <p><strong>Gia sư đảm nhận:</strong> {getTutorInfo(selectedCourse.tutor_id).full_name}</p>
            </div>

            <hr className={styles.divider} />

            <h3>Các buổi học đã hoàn thành & gửi xác nhận</h3>
            <div className={styles.lessonsList}>
              {currentCourseConfirmations.length > 0 ? (
                currentCourseConfirmations.map((lesson) => (
                  <div key={lesson.id || lesson.comfirmation_id} className={styles.lessonItem}>
                    <div className={styles.lessonMain}>
                      <span className={styles.lessonBadge}>Buổi {lesson.lesson_number}</span>
                      <span className={styles.lessonDate}>Ngày: {lesson.lesson_date}</span>
                      <span className={styles.lessonAmount}>
                        +{lesson.lesson_amount?.toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>

                    <div className={styles.lessonDetails}>
                      <p>
                        <strong>Record Link:</strong>{' '}
                        {lesson.record_url ? (
                          <a href={lesson.record_url.startsWith('http') ? lesson.record_url : `https://${lesson.record_url}`} target="_blank" rel="noreferrer">
                            {lesson.record_url}
                          </a>
                        ) : (
                          <em>(Không có link record)</em>
                        )}
                      </p>
                      <p>
                        <strong>Ghi chú gia sư:</strong>{' '}
                        {lesson.note ? lesson.note : <em>(Không có ghi chú)</em>}
                      </p>
                      <p className={styles.statusText}>
                        Trạng thái: <span>{lesson.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}</span> | Thanh toán: <span>{lesson.payout_status === 'transferred' ? 'Đã thanh toán' : 'Chờ thanh toán'}</span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noData}>Chưa có buổi học nào được xác nhận hoàn thành.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}