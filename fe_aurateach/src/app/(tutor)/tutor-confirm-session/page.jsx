"use client";

import React, { useState, useEffect } from 'react';
import styles from './session-confirmation.module.css';

// Import các service
import { courseService } from '@/services/courseService';
import { classSessionService } from '@/services/classSessionService';
import { userService } from '@/services/userService';
import { tutorService } from '@/services/tutorService';

// Hàm helper đọc và parse cookie an toàn
const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const rawVal = parts.pop().split(';').shift();
    if (!rawVal) return null;
    
    try {
      const decodedVal = decodeURIComponent(rawVal);
      try {
        const parsed = JSON.parse(decodedVal);
        return typeof parsed === 'object' && parsed !== null ? (parsed.user_id || parsed.id || parsed) : parsed;
      } catch (e) {
        return decodedVal.replace(/^"|"$/g, '');
      }
    } catch (e) {
      return rawVal;
    }
  }
  return null;
};

export default function SessionConfirm() {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [classSessions, setClassSessions] = useState([]);
  const [currentTutorId, setCurrentTutorId] = useState(null);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [studentsInClass, setStudentsInClass] = useState([]);
  
  // States Form & Điểm danh
  const [recordLink, setRecordLink] = useState('');
  const [tutorNote, setTutorNote] = useState('');
  const [attendance, setAttendance] = useState({});
  const [isSubmitAllowed, setIsSubmitAllowed] = useState(false);

  useEffect(() => {
    const userId = getCookie('user_info');  
    fetchData(userId);
  }, []);

  const fetchData = async (cookieUserId) => {
    let finalTutorId = null;
    try {
      const [dataCourses, dataUsers, dataTutors, dataSessions] = await Promise.all([
        courseService.getCourses(),
        userService.getUsers(),
        tutorService.getTutors(),
        classSessionService.getSessions().catch(() => [])
      ]);
      
      setCourses(Array.isArray(dataCourses) ? dataCourses : (dataCourses.data || []));
      setUsers(Array.isArray(dataUsers) ? dataUsers : (dataUsers.data || []));
      setTutors(Array.isArray(dataTutors) ? dataTutors : (dataTutors.data || []));
      setClassSessions(Array.isArray(dataSessions) ? dataSessions : (dataSessions.data || []));

      const tutorsList = Array.isArray(dataTutors) ? dataTutors : (dataTutors.data || []);

      if (cookieUserId) {
        const isDirectTutor = tutorsList.some(t => String(t.tutor_id) === String(cookieUserId));
        
        if (isDirectTutor) {
          finalTutorId = cookieUserId;
        } else {
          const matchedTutor = tutorsList.find(t => String(t.user_id) === String(cookieUserId));
          if (matchedTutor) {
            finalTutorId = matchedTutor.tutor_id;
          }
        }
      }
      
      setCurrentTutorId(finalTutorId);
    } catch (err) {
      console.error("Lỗi khi fetch dữ liệu API qua Service:", err);
    }
  };

  const getTodayValidCourses = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysMap = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const currentDayStr = daysMap[now.getDay()]; 

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    return courses.filter((course) => {
      if (!currentTutorId || String(course.tutor_id) !== String(currentTutorId)) {
        return false;
      }
      
      if (course.end_date) {
        const endDateParts = course.end_date.split('T')[0].split('-').map(Number);
        if (endDateParts.length === 3) {
          const courseEndDate = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2]);
          if (todayStart > courseEndDate) {
            return false;
          }
        }
      }

      const hasClassToday = course.schedule_days && course.schedule_days.includes(currentDayStr);
      if (!hasClassToday) return false;

      const isAlreadySubmittedToday = classSessions.some(
        s => String(s.course_id) === String(course.course_id) && s.created_at && s.created_at.startsWith(todayStr)
      );
      if (isAlreadySubmittedToday) return false;
      
      if (course.time_slot) {
        const times = course.time_slot.split('-');
        if (times.length === 2) {
          const [startHour, startMin] = times[0].split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endOfDayMinutes = 23 * 60;

          if (currentMinutes >= startMinutes && currentMinutes <= endOfDayMinutes) {
            return true;
          }
        }
      }
      return false;
    });
  };  

  const handleOpenDetail = (course) => {
    setSelectedCourse(course);
    setRecordLink('');
    setTutorNote('');

    const classStudents = users.filter(u => course.students && course.students.includes(u.user_id));
    setStudentsInClass(classStudents);

    const savedDraft = localStorage.getItem(`draft_attendance_${course.course_id}`);
    if (savedDraft) {
      setAttendance(JSON.parse(savedDraft));
    } else {
      const initAttendance = {};
      classStudents.forEach(st => {
        initAttendance[st.user_id] = { present: false, comment: '' };
      });
      setAttendance(initAttendance);
    }

    checkTimeAndStatus(course);
  };

  const checkTimeAndStatus = (course) => {
    const now = new Date();
    
    if (course.time_slot) {
      const times = course.time_slot.split('-');
      if (times.length === 2) {
        const [endHour, endMin] = times[1].split(':').map(Number);
        const endTimeDate = new Date();
        endTimeDate.setHours(endHour, endMin, 0, 0);

        if (now >= endTimeDate) {
          setIsSubmitAllowed(true);
        } else {
          setIsSubmitAllowed(false);
        }
      }
    }
  };

  const handleToggleCheck = (studentId) => {
    const updated = {
      ...attendance,
      [studentId]: {
        ...attendance[studentId],
        present: !attendance[studentId]?.present
      }
    };
    setAttendance(updated);
    localStorage.setItem(`draft_attendance_${selectedCourse.course_id}`, JSON.stringify(updated));
  };

  const handleCommentChange = (studentId, comment) => {
    const updated = {
      ...attendance,
      [studentId]: {
        ...attendance[studentId],
        comment: comment
      }
    };
    setAttendance(updated);
    localStorage.setItem(`draft_attendance_${selectedCourse.course_id}`, JSON.stringify(updated));
  };

  const handleCloseModal = () => {
    setSelectedCourse(null);
  };

  const handleSubmitSession = async (e) => {
    e.preventDefault();

    if (!recordLink.trim()) {
      alert("Vui lòng điền link video record của buổi học!");
      return;
    }

    const generatedSessionId = `ss_${Date.now()}`;

    const sessionPayload = {
      session_id: generatedSessionId,
      course_id: selectedCourse.course_id,
      actual_date: new Date().toISOString(),
      start_time: selectedCourse.time_slot ? selectedCourse.time_slot.split('-')[0] : "",
      end_time: selectedCourse.time_slot ? selectedCourse.time_slot.split('-')[1] : "",
      lesson_title: selectedCourse.title,
      record_url: recordLink,
      tutor_note: tutorNote,
      session_status: "completed",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // 🚀 Gọi qua classSessionService sạch sẽ
      const resSession = await classSessionService.createSession(sessionPayload);
      const createdSession = resSession.data !== undefined ? resSession.data : resSession;
      const actualSessionId = createdSession?.session_id || createdSession?.id || generatedSessionId;

      const attendancePayloadList = Object.keys(attendance).map(studentId => ({
        attendance_id: `att_${Date.now()}_${studentId}`,
        session_id: actualSessionId,
        student_id: studentId,
        attendance_status: attendance[studentId].present,
        tutor_comment: attendance[studentId].comment || "",
        created_at: new Date().toISOString(),
        update: new Date().toISOString()
      }));

      await Promise.all(
        attendancePayloadList.map(attData =>
          classSessionService.createSessionAttendance(attData).catch(err => {
            console.warn("Lưu điểm danh sinh viên thất bại:", attData.student_id);
          })
        )
      );

      localStorage.removeItem(`draft_attendance_${selectedCourse.course_id}`);

      alert("Xác nhận buổi học thành công!");
      handleCloseModal();

      const activeUserId = getCookie('user_info');
      await fetchData(activeUserId);
    } catch (error) {
      console.error("Lỗi khi gửi dữ liệu xác nhận buổi học:", error);
      alert("Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại!");
    }
  };

  // --- TỰ ĐỘNG LƯU TRẠNG THÁI "UNCOMPLETED" NẾU QUÁ 23:00 MÀ CHƯA XÁC NHẬN ---
  useEffect(() => {
    const checkDeadlineAndAutoUpdate = async () => {
      const now = new Date();
      const daysMap = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const currentDayStr = daysMap[now.getDay()];

      if (now.getHours() >= 23) {
        let existingSessions = [];
        try {
          const res = await classSessionService.getSessions();
          existingSessions = Array.isArray(res) ? res : (res.data || []);
        } catch (e) {
          console.error("Lỗi lấy danh sách class_sessions:", e);
        }

        const todayStr = now.toISOString().split('T')[0];

        for (const course of courses) {
          if (currentTutorId && String(course.tutor_id) === String(currentTutorId)) {
            const hasClassToday = course.schedule_days && course.schedule_days.includes(currentDayStr);
            
            if (hasClassToday) {
              const isAlreadyRecorded = existingSessions.some(
                s => String(s.course_id) === String(course.course_id) && s.created_at && s.created_at.startsWith(todayStr)
              );

              if (!isAlreadyRecorded) {
                const failSession = {
                  session_id: `ss_uncompleted_${Date.now()}_${course.course_id}`,
                  course_id: course.course_id,
                  actual_date: new Date().toISOString(),
                  start_time: course.time_slot ? course.time_slot.split('-')[0] : "",
                  end_time: course.time_slot ? course.time_slot.split('-')[1] : "",
                  lesson_title: course.title,
                  record_link: "",
                  tutor_note: "Chưa hoàn thành xác nhận buổi học trước 23:00",
                  session_status: "uncompleted",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                
                try {
                  await classSessionService.createSession(failSession);
                  localStorage.removeItem(`draft_attendance_${course.course_id}`);
                } catch (err) {
                  console.error("Lỗi auto update 23h:", err);
                }
              }
            }
          }
        }
      }
    };

    if (courses.length > 0) {
      checkDeadlineAndAutoUpdate();
    }
  }, [courses.length, currentTutorId]);

  const validCourses = getTodayValidCourses();

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Danh Sách Xác Nhận Buổi Học Hôm Nay</h2>

      <div className={styles.classList}>
        {validCourses.length === 0 ? (
          <div className={styles.emptyState}>Không có lớp học nào thuộc về bạn đang diễn ra hoặc cần xác nhận trong hôm nay.</div>
        ) : (
          validCourses.map((item) => (
            <div key={item.id || item.course_id} className={styles.classCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.courseTitle}>{item.title}</h3>
                <span className={item.status === 'active' ? styles.badgeActive : styles.badgeEnded}>
                  {item.status === 'active' ? 'Đang diễn ra' : 'Đã kết thúc'}
                </span>
              </div>
              <div className={styles.cardBody}>
                <p><strong>Khung giờ:</strong> {item.time_slot}</p>
                <p><strong>Ngày học:</strong> {item.schedule_days ? item.schedule_days.join(', ') : 'Chưa xếp'}</p>
                <p><strong>Sĩ số:</strong> {item.students ? item.students.length : 0} học sinh</p>
              </div>
              <button 
                className={styles.btnDetail}
                onClick={() => handleOpenDetail(item)}
              >
                Xem chi tiết
              </button>
            </div>
          ))
        )}
      </div>

      {selectedCourse && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button className={styles.closeBtn} onClick={handleCloseModal}>&times;</button>
            <h3>Chi Tiết Buổi Học - {selectedCourse.title}</h3>
            
            <form onSubmit={handleSubmitSession}>
              <div className={styles.formGroup}>
                <label>Link Video Record (Drive) <span className={styles.required}>*</span></label>
                <input 
                  type="url" 
                  className={styles.inputField} 
                  placeholder="https://drive.google.com/file/d/..."
                  value={recordLink}
                  onChange={(e) => setRecordLink(e.target.value)}
                  required 
                />
              </div>

              <div className={styles.formGroup}>
                <label>Ghi chú của gia sư</label>
                <textarea 
                  className={styles.textareaField} 
                  placeholder="Nhập ghi chú cho buổi học..."
                  value={tutorNote}
                  onChange={(e) => setTutorNote(e.target.value)}
                />
              </div>

              <div className={styles.attendanceSection}>
                <div className={styles.attendanceTitle}>Danh sách điểm danh học sinh:</div>
                
                {studentsInClass.length === 0 ? (
                  <p className={styles.emptyState}>Chưa có học sinh trong lớp học này.</p>
                ) : (
                  studentsInClass.map((st) => {
                    const isChecked = attendance[st.user_id]?.present || false;
                    return (
                      <div 
                        key={st.user_id} 
                        className={`${styles.studentRow} ${isChecked ? styles.studentPresent : ''}`}
                      >
                        <div className={styles.studentInfo}>
                          <img 
                            src={st.avatar || '/img/avt/avt.jpg'} 
                            alt={st.full_name} 
                            className={styles.avatar} 
                          />
                          <span className={styles.studentName}>{st.full_name}</span>
                        </div>

                        <div className={styles.checkGroup}>
                          <input 
                            type="text"
                            placeholder="Nhận xét học sinh..."
                            className={styles.commentInput}
                            value={attendance[st.user_id]?.comment || ''}
                            onChange={(e) => handleCommentChange(st.user_id, e.target.value)}
                          />

                          <input 
                            type="checkbox" 
                            className={styles.checkbox}
                            checked={isChecked}
                            onChange={() => handleToggleCheck(st.user_id)}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <button 
                type="submit" 
                className={styles.btnSubmit}
                disabled={!isSubmitAllowed}
                title={!isSubmitAllowed ? "Chưa đến thời gian kết thúc buổi học để xác nhận" : ""}
              >
                {isSubmitAllowed ? "Xác nhận hoàn thành buổi học" : "Chờ hết giờ học để xác nhận"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}