"use client";

import React, { useState, useEffect } from 'react';
import styles from './session-confirmation.module.css';

const API_BASE_URL = 'http://localhost:3007';

// Hàm helper đọc và parse cookie an toàn (giải mã URL encode & parse JSON nếu có)
const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const rawVal = parts.pop().split(';').shift();
    if (!rawVal) return null;
    
    try {
      // Decode chuỗi bị mã hóa URL
      const decodedVal = decodeURIComponent(rawVal);
      try {
        // Nếu cookie lưu dạng JSON object hoặc string được stringify
        const parsed = JSON.parse(decodedVal);
        return typeof parsed === 'object' && parsed !== null ? (parsed.user_id || parsed.id || parsed) : parsed;
      } catch (e) {
        // Nếu không phải JSON hợp lệ thì dùng chuỗi sau khi decode
        return decodedVal.replace(/^"|"$/g, ''); // Loại bỏ dấu ngoặc kép thừa nếu có
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
    // Đọc cookie user_info an toàn
    const userId = getCookie('user_info');  
    console.log("cookie IDDDD", userId);
    fetchData(userId);
  }, []);

  const fetchData = async (cookieUserId) => {
    let finalTutorId = null;
    try {
      const [resCourses, resUsers, resTutors, resSessions] = await Promise.all([
        fetch(`${API_BASE_URL}/courses`),
        fetch(`${API_BASE_URL}/users`),
        fetch(`${API_BASE_URL}/tutors`),
        fetch(`${API_BASE_URL}/class_sessions`)
      ]);
      
      const dataCourses = await resCourses.json();
      const dataUsers = await resUsers.json();
      const dataTutors = await resTutors.json();
      const dataSessions = resSessions.ok ? await resSessions.json() : [];
      
      setCourses(dataCourses);
      setUsers(dataUsers);
      setTutors(dataTutors);
      setClassSessions(dataSessions);

      if (cookieUserId) {
        // Kiểm tra xem cookieUserId có trực tiếp là tutor_id hay không
        const isDirectTutor = dataTutors.some(t => String(t.tutor_id) === String(cookieUserId));
        
        if (isDirectTutor) {
          finalTutorId = cookieUserId;
        } else {
          // Nếu cookieUserId là user_id, tìm tutor_id tương ứng
          const matchedTutor = dataTutors.find(t => String(t.user_id) === String(cookieUserId));
          if (matchedTutor) {
            finalTutorId = matchedTutor.tutor_id;
          }
        }
      }
      
      setCurrentTutorId(finalTutorId);
    } catch (err) {
      console.error("Lỗi khi fetch dữ liệu API:", err);
    }
  };

  // --- HÀM LỌC LỚP HỌC CỦA GIA SƯ TRONG NGÀY VÀ TRONG/ĐÃ QUA GIỜ HỌC ---
  const getTodayValidCourses = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Đưa ngày hiện tại về đầu ngày (00:00:00) để so sánh chuẩn xác với end_date
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Áp dụng ngày theo chuẩn thứ trong tuần
    const daysMap = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const currentDayStr = daysMap[now.getDay()]; 

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    console.log("lop hoc chua loc", courses);
    
    return courses.filter((course) => {
      // 0. Điều kiện 1: Lớp phải thuộc về gia sư đang đăng nhập
      if (!currentTutorId || String(course.tutor_id) !== String(currentTutorId)) {
        return false;
      }
      
      // 0.1. Điều kiện Mới: Kiểm tra lớp học chưa vượt quá end_date
      if (course.end_date) {
        const endDateParts = course.end_date.split('T')[0].split('-').map(Number);
        if (endDateParts.length === 3) {
          const courseEndDate = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2]);
          // Nếu ngày hôm nay > ngày kết thúc (end_date) của khóa học thì không hiển thị
          if (todayStart > courseEndDate) {
            return false;
          }
        }
      }

      // 1. Điều kiện 2: Kiểm tra ngày học hôm nay có nằm trong schedule_days không
      const hasClassToday = course.schedule_days && course.schedule_days.includes(currentDayStr);
      if (!hasClassToday) return false;

      // 2. Điều kiện 3: Loại bỏ lớp đã xác nhận trong ngày hôm nay
      const isAlreadySubmittedToday = classSessions.some(
        s => s.course_id === course.course_id && s.created_at && s.created_at.startsWith(todayStr)
      );
      if (isAlreadySubmittedToday) return false;
      
      // 3. Điều kiện 4: Kiểm tra khung giờ học (Giờ bắt đầu <= Hiện tại <= 23:00)
      if (course.time_slot) {
        const times = course.time_slot.split('-');
        if (times.length === 2) {
          const [startHour, startMin] = times[0].split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endOfDayMinutes = 23 * 60; // 23:00 (1380 phút)

          // Chỉ hiển thị khi đã đến giờ bắt đầu lớp và trước 23:00 cùng ngày
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
      const resSession = await fetch(`${API_BASE_URL}/class_sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionPayload)
      });

      if (!resSession.ok) {
        const errText = await resSession.text();
        console.error("Lỗi server class_sessions:", errText);
        throw new Error("Không thể lưu buổi học vào class_sessions");
      }

      const createdSession = await resSession.json();
      const actualSessionId = createdSession.session_id || createdSession.id || generatedSessionId;

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
          fetch(`${API_BASE_URL}/session_attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attData)
          }).then(res => {
            if (!res.ok) console.warn("Lưu điểm danh sinh viên thất bại:", attData.student_id);
          })
        )
      );

      localStorage.removeItem(`draft_attendance_${selectedCourse.course_id}`);

      alert("Xác nhận buổi học thành công!");
      handleCloseModal();

      // Đồng bộ cookie chuẩn xác để re-fetch dữ liệu
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
        // Lấy danh sách session đã tồn tại để tránh tạo trùng record uncompleted
        let existingSessions = [];
        try {
          const res = await fetch(`${API_BASE_URL}/class_sessions`);
          existingSessions = await res.json();
        } catch (e) {
          console.error("Lỗi lấy danh sách class_sessions:", e);
        }

        const todayStr = now.toISOString().split('T')[0];

        for (const course of courses) {
          // Lớp thuộc về gia sư và có lịch học hôm nay
          if (currentTutorId && String(course.tutor_id) === String(currentTutorId)) {
            const hasClassToday = course.schedule_days && course.schedule_days.includes(currentDayStr);
            
            if (hasClassToday) {
              // Kiểm tra xem đã có xác nhận session cho ngày hôm nay chưa
              const isAlreadyRecorded = existingSessions.some(
                s => s.course_id === course.course_id && s.created_at && s.created_at.startsWith(todayStr)
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
                  await fetch(`${API_BASE_URL}/class_sessions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(failSession)
                  });
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

  // Lấy danh sách đã lọc theo điều kiện gia sư + lịch hôm nay + giờ học + chưa xác nhận hôm nay
  const validCourses = getTodayValidCourses();
  console.log("Valid Courses:", validCourses);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Danh Sách Xác Nhận Buổi Học Hôm Nay</h2>

      {/* Hiển thị danh sách các lớp thỏa điều kiện */}
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

      {/* Modal chi tiết & Form điểm danh */}
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