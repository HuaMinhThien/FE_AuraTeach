"use client";

import React, { useState, useEffect } from 'react';
import styles from './session-confirmation.module.css';

// Chỉ sử dụng duy nhất classSessionService
import { classSessionService } from '@/services/classSessionService';

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

// 🔥 Hàm helper hiển thị nhãn trạng thái buổi học theo chuẩn mới
const getStatusBadge = (status, isMakeup) => {
  if (isMakeup) {
    return <span className="badge" style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#ffedd5', color: '#c2410c' }}>Học bù</span>;
  }

  switch (String(status)) {
    case '1':
      return <span className="badge" style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#6c757d', color: '#fff' }}>Chưa diễn ra</span>;
    case '2':
      return <span className="badge" style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#0dcaf0', color: '#000' }}>Sắp diễn ra</span>;
    case '3':
      return <span className="badge" style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#198754', color: '#fff' }}>Đang diễn ra</span>;
    case '4':
      return <span className="badge" style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#ffc107', color: '#000' }}>Chờ xác nhận</span>;
    case '5':
      return <span className="badge" style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#0d6efd', color: '#fff' }}>Đã hoàn thành</span>;
    default:
      return <span className="badge" style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#f8f9fa', color: '#000' }}>Đang diễn ra</span>;
  }
};

export default function SessionConfirm() {
  const [todayItems, setTodayItems] = useState([]);
  const [currentTutorId, setCurrentTutorId] = useState(null);

  const [selectedSession, setSelectedSession] = useState(null);
  const [studentsInClass, setStudentsInClass] = useState([]);
  
  // States Form & Điểm danh
  const [recordLink, setRecordLink] = useState('');
  const [tutorNote, setTutorNote] = useState('');
  const [attendance, setAttendance] = useState({});
  const [isSubmitAllowed, setIsSubmitAllowed] = useState(false);

  useEffect(() => {
    const userId = getCookie('user_info');  
    setCurrentTutorId(userId);
    if (userId) {
      fetchTodayData(userId);
    }
  }, []);

  const fetchTodayData = async (tutorId) => {
    try {
      const res = await classSessionService.getTodaySessions({ tutor_id: tutorId });
      const responseData = res?.data !== undefined ? res.data : res;
      const sessionsArray = Array.isArray(responseData) 
        ? responseData 
        : (responseData?.data || []);
      setTodayItems(sessionsArray);
    } catch (err) {
      console.error("❌ Lỗi khi gọi getTodaySessions:", err);
    }
  };

  const handleOpenDetail = (sessionItem) => {    
    setSelectedSession(sessionItem);
    setRecordLink(sessionItem.record_url || '');
    setTutorNote(sessionItem.document_url || sessionItem.tutor_note || '');

    const classStudents = 
      sessionItem.flattened_students || 
      sessionItem.students || 
      sessionItem.attendances || 
      sessionItem.class_students ||
      sessionItem.course?.students ||
      sessionItem.course?.users ||
      sessionItem.course?.subscriptions?.map(sub => sub.student?.user || sub.student || sub.user) || 
      [];
    setStudentsInClass(classStudents);

    const sessionId = sessionItem.session_id || sessionItem.id;
    const draftKey = `draft_attendance_${sessionId}`;

    const savedDraft = localStorage.getItem(draftKey);    
    if (savedDraft) {
      try {
        setAttendance(JSON.parse(savedDraft));
      } catch (e) {
        setAttendance({});
      }
    } else {
      const initAttendance = {};
      classStudents.forEach(st => {
        const sId = st.student_id || st.user_id || st.id;
        initAttendance[sId] = { 
          present: st.attendance_status === 'present' || false, 
          comment: st.tutor_comment || '' 
        };
      });
      setAttendance(initAttendance);
    }

    checkTimeAndStatus(sessionItem);
  };

  const checkTimeAndStatus = (sessionItem) => {
    const now = new Date();
    const endTimeStr = sessionItem.end_time || (sessionItem.time_slot ? sessionItem.time_slot.split('-')[1] : null);

    if (endTimeStr) {
      const [endHour, endMin] = endTimeStr.trim().split(':').map(Number);
      const endTimeDate = new Date();
      endTimeDate.setHours(endHour, endMin || 0, 0, 0);

      const allowed = now >= endTimeDate;
      setIsSubmitAllowed(allowed);
    } else {
      setIsSubmitAllowed(true);
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

    const sessionId = selectedSession.session_id || selectedSession.id;
    localStorage.setItem(`draft_attendance_${sessionId}`, JSON.stringify(updated));  
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

    const sessionId = selectedSession.session_id || selectedSession.id;
    localStorage.setItem(`draft_attendance_${sessionId}`, JSON.stringify(updated));  
  };

  const handleCloseModal = () => {
    setSelectedSession(null);
  };

  const handleSubmitSession = async (e) => {
    e.preventDefault();
    try {
      const sessionId = selectedSession.session_id || selectedSession.id;
      const courseId = selectedSession.course_id;
      
      const attendancesPayload = studentsInClass.map(student => {
        const sId = student.student_id || student.user_id || student.id;
        return {
          student_id: sId,
          attendance_status: attendance[sId]?.present ? 'present' : 'absent',
          tutor_comment: attendance[sId]?.comment || ''
        };
      });

      const payload = {
        session_id: sessionId,
        course_id: courseId,
        actual_date: selectedSession.actual_date || new Date().toISOString(),
        lesson_title: selectedSession.lesson_title || selectedSession.title,
        record_url: recordLink,
        document_url: tutorNote, 
        attendances: attendancesPayload,
        is_makeup: !!selectedSession.is_makeup
      };

      const res = await classSessionService.confirmSessionAndAttendance(payload);

      if (res) {
        alert("Xác nhận buổi học thành công!");
        localStorage.removeItem(`draft_attendance_${sessionId}`);
        handleCloseModal();
        if (currentTutorId) {
          fetchTodayData(currentTutorId);
        }
      }
    } catch (error) {
      console.error("❌ [Submit Error] Lỗi xác nhận buổi học:", error);
      alert("Có lỗi xảy ra, vui lòng kiểm tra lại dữ liệu.");
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Danh Sách Xác Nhận Buổi Học Hôm Nay</h2>

      <div className={styles.classList}>
        {todayItems.length === 0 ? (
          <div className={styles.emptyState}>Không có lớp học hoặc buổi học nào cần xác nhận trong hôm nay.</div>
        ) : (
          todayItems.map((item) => {
            const isMakeup = item.is_makeup;
            const title = item.lesson_title || item.title || 'Buổi học hôm nay';
            const timeSlot = item.time_slot || `${item.start_time || ''} - ${item.end_time || ''}`;
            
            // Tính toán sĩ số an toàn từ nhiều trường dữ liệu trả về của API
            const totalStudents = (
              item.flattened_students || 
              item.students || 
              item.attendances || 
              item.class_students ||
              item.course?.students ||
              item.course?.users ||
              item.course?.subscriptions || 
              []
            ).length;

            return (
              <div 
                key={item.session_id || item.id} 
                className={styles.classCard} 
                style={isMakeup ? { borderLeft: '4px solid #ea580c' } : {}}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.courseTitle}>
                    {title}
                    {isMakeup && (
                      <span style={{
                        marginLeft: 8,
                        padding: '2px 8px',
                        background: '#ffedd5',
                        color: '#c2410c',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 999
                      }}>
                        Học bù
                      </span>
                    )}
                  </h3>
                  
                  {/* 🔥 Hiển thị Badge trạng thái tự động */}
                  <div>
                    {getStatusBadge(item.session_status, isMakeup)}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <p><strong>Khung giờ:</strong> {timeSlot}</p>
                  <p><strong>Sĩ số:</strong> {totalStudents} học sinh</p>                 
                  {item.tutor_note && <p><strong>Ghi chú:</strong> {item.tutor_note}</p>}
                </div>

                <button 
                  className={styles.btnDetail}
                  onClick={() => handleOpenDetail(item)}
                  style={isMakeup ? { background: '#ea580c' } : {}}
                >
                  {isMakeup ? 'Xác nhận buổi học bù' : 'Xem chi tiết & Điểm danh'}
                </button>
              </div>
            );
          })
        )}
      </div>

      {selectedSession && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button className={styles.closeBtn} onClick={handleCloseModal}>&times;</button>
            <h3>
              Chi Tiết Buổi Học - {selectedSession.lesson_title || selectedSession.title}
              {selectedSession.is_makeup && (
                <span style={{
                  marginLeft: 10,
                  padding: '3px 10px',
                  background: '#ffedd5',
                  color: '#c2410c',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 999
                }}>
                  Học bù
                </span>
              )}
            </h3>           
            
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
                  <p className={styles.emptyState}>Chưa có thông tin học sinh trong buổi này.</p>
                ) : (
                  studentsInClass.map((st, index) => {
                    const studentId = st.student_id || st.user_id || st.id;
                    const uniqueKey = `${studentId}-${index}`; 
                    const isChecked = attendance[studentId]?.present || false;
                    return (
                      <div 
                        key={uniqueKey} 
                        className={`${styles.studentRow} ${isChecked ? styles.studentPresent : ''}`}
                      >
                        <div className={styles.studentInfo}>
                          <img 
                            src={st.avatar || '/img/avt/avt.jpg'} 
                            alt={st.full_name || st.name} 
                            className={styles.avatar} 
                          />
                          <span className={styles.studentName}>{st.full_name || st.name}</span>
                        </div>

                        <div className={styles.checkGroup}>
                          <input 
                            type="text"
                            placeholder="Nhận xét học sinh..."
                            className={styles.commentInput}
                            value={attendance[studentId]?.comment || ''}
                            onChange={(e) => handleCommentChange(studentId, e.target.value)}
                          />

                          <input 
                            type="checkbox" 
                            className={styles.checkbox}
                            checked={isChecked}
                            onChange={() => handleToggleCheck(studentId)}
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
                style={selectedSession.is_makeup ? { background: '#ea580c' } : {}}
              >
                {isSubmitAllowed 
                  ? (selectedSession.is_makeup ? "Xác nhận hoàn thành buổi học bù" : "Xác nhận hoàn thành buổi học") 
                  : "Chờ hết giờ học để xác nhận"
                }            
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}