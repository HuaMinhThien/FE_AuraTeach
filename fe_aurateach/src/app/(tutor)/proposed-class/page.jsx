"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './proposed-class.module.css';
import { classRequestService } from '@/services/classRequestService';
import { authService } from '@/services/authService';
import { categoryService } from '@/services/categoryService';
import { adminService } from '@/services/adminService';
import { courseService } from '@/services/courseService';
import { tutorService } from '@/services/tutorService';

export default function ProposedClassPage() {
  const router = useRouter();
  const [currentTutorId, setCurrentTutorId] = useState(null);  // user_id
  const [realTutorId, setRealTutorId] = useState(null);         // tutor_id thực trong bảng tutors
  const [activeTab, setActiveTab] = useState('student');

  const [proposedClasses, setProposedClasses] = useState([]);
  const [adminSuggestions, setAdminSuggestions] = useState([]);
  const [categories, setCategories] = useState([]); // <-- State lưu danh sách môn học
  
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // 1. Lấy thông tin user bằng authService
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user && (user.user_id || user.id)) {
          const userId = user.user_id || user.id;
          setCurrentTutorId(userId);

          // Resolve tutor_id thực để dùng cho check trùng lịch
          try {
            const tutorRes = await tutorService.getByUserId(userId);
            const tutorData = tutorRes?.data || tutorRes;
            // BE trả về array (->get()), lấy phần tử đầu tiên
            const tutorObj = Array.isArray(tutorData) ? tutorData[0] : tutorData;
            const tid = tutorObj?.tutor_id || tutorObj?.id;
            if (tid) setRealTutorId(tid);
            console.log('[ProposedClass] Resolved tutor_id:', tid, 'from tutorData:', tutorObj);
          } catch (e) {
            console.warn('[ProposedClass] Không resolve được tutor_id:', e);
          }
        } else {
          alert("Vui lòng đăng nhập để xem danh sách lớp!");
          router.push('/login');
        }
      } catch (error) {
        console.error("Lỗi lấy thông tin người dùng:", error);
        router.push('/login');
      }
    };
    fetchUser();
  }, [router]);

  // 2. Fetch danh sách danh mục (môn học) khi trang được load
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getCategories();
        const listData = response.data || response;
        setCategories(Array.isArray(listData) ? listData : []);
      } catch (error) {
        console.error("Lỗi khi tải danh mục môn học:", error);
      }
    };
    fetchCategories();
  }, []);

  // Hàm chuyển đổi category_id thành category_name
  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'Chưa phân loại';
    const found = categories.find(cat => String(cat.category_id || cat.id) === String(categoryId));
    return found ? (found.category_name || found.name) : categoryId; // Nếu không tìm thấy thì tạm hiện ID để debug
  };

  // 3. Fetch dữ liệu lớp học dựa trên tab
  useEffect(() => {
    if (!currentTutorId) return;

    if (activeTab === 'student') {
      fetchStudentClasses();
    } else {
      fetchAdminSuggestions();
    }
  }, [currentTutorId, activeTab]);

  const fetchStudentClasses = async () => {
    setLoading(true);
    try {
      const response = await classRequestService.getClassRequests({ tutor_id: currentTutorId });
      const listData = response.data || response;
      setProposedClasses(Array.isArray(listData) ? listData : []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp từ học sinh:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      // ✅ Dùng đúng endpoint: GET /tutors/{userId}/suggestions
      // Backend tự resolve user_id → tutor_id và trả về các lớp pending phù hợp
      const response = await adminService.getTutorSuggestions(currentTutorId);
      const listData = response.data || response;
      setAdminSuggestions(Array.isArray(listData) ? listData : []);
    } catch (error) {
      console.error("Lỗi khi tải đề xuất từ admin:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleApplyClass = async (requestId) => {
    // Tìm object lớp để check trùng lịch
    const targetClass = proposedClasses.find(
      c => (c.request_id || c.requests_id || c.id) === requestId
    );

    if (targetClass) {
      const { conflict, message } = await checkTutorScheduleConflict(targetClass);
      if (conflict) {
        const confirmed = window.confirm(message);
        if (!confirmed) return;
      }
    }

    setSubmitting(true);
    try {
      await classRequestService.applyClassRequest({
        requests_id: requestId,
        tutor_id: currentTutorId
      });
      alert("Đã gửi yêu cầu nhận dạy thành công!");
      setSelectedClass(null);
      fetchStudentClasses();
    } catch (error) {
      alert(error.message || "Có lỗi xảy ra khi ứng tuyển.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptSuggestion = async (course) => {
    if (!confirm(`Bạn có chắc muốn nhận lớp "${course.title}"?`)) return;

    // Kiểm tra trùng lịch dạy
    const { conflict, message } = await checkTutorScheduleConflict(course);
    if (conflict) {
      const confirmed = window.confirm(message);
      if (!confirmed) return;
    }

    setSubmitting(true);
    try {
      // ✅ SỬA LẠI: Truyền chính xác course.request_id
      const classId = course.request_id || course.course_id || course.id;
      
      const result = await classRequestService.acceptAdminSuggestion(classId, currentTutorId);
      if (result && result.success !== false) {
        alert("🎉 Nhận lớp thành công!");
        setSelectedClass(null);
        fetchAdminSuggestions();
      } else {
        alert(result?.message || "Nhận lớp thất bại.");
      }
    } catch (error) {
      alert(error.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  // Hàm kiểm tra trùng lịch dạy của gia sư
  // Trả về { conflict: true, message: "..." } nếu trùng, { conflict: false } nếu không
  const checkTutorScheduleConflict = async (newClass) => {
    try {
      const tidToUse = realTutorId || currentTutorId;
      const courses = await courseService.getTutorScheduleCourses(tidToUse);
      const courseList = Array.isArray(courses) ? courses : (courses?.data || []);

      console.log('[ConflictCheck] tutor_id used:', tidToUse);
      console.log('[ConflictCheck] existing courses:', courseList.length, courseList.map(c => ({ title: c.title, status: c.status, schedule_days: c.schedule_days, time_slot: c.time_slot })));
      console.log('[ConflictCheck] newClass:', { title: newClass.title, schedule_days: newClass.schedule_days, start_time: newClass.start_time, time_slot: newClass.time_slot });

      // Lấy thông tin lịch của lớp mới
      let newDays = [];
      if (Array.isArray(newClass.schedule_days)) {
        newDays = newClass.schedule_days;
      } else if (typeof newClass.schedule_days === 'string') {
        try { newDays = JSON.parse(newClass.schedule_days); } catch { newDays = newClass.schedule_days.split(',').map(s => s.trim()); }
      }

      // Xây time_slot từ start_time nếu không có sẵn (lớp từ học sinh chỉ có start_time)
      let newTimeSlot = newClass.time_slot || '';
      if (!newTimeSlot && newClass.start_time) {
        const startH = parseInt(newClass.start_time.split(':')[0], 10);
        const endH = startH + 2;
        newTimeSlot = `${String(startH).padStart(2,'0')}:00-${String(endH).padStart(2,'0')}:00`;
      }
      const [newStartStr, newEndStr] = newTimeSlot.split('-').map(s => s?.trim());
      const newStartH = parseInt((newStartStr || '0').split(':')[0], 10);
      const newEndH = parseInt((newEndStr || '0').split(':')[0], 10) || (newStartH + 2);

      const newStartDate = newClass.start_date ? new Date(newClass.start_date) : null;
      const totalWeeks = Number(newClass.total_weeks || 1);
      const newEndDate = newStartDate ? new Date(new Date(newStartDate).setDate(newStartDate.getDate() + totalWeeks * 7)) : null;

      if (newDays.length === 0) return { conflict: false };

      const dayOrder = { 'Thứ 2':1,'Thứ 3':2,'Thứ 4':3,'Thứ 5':4,'Thứ 6':5,'Thứ 7':6,'Chủ Nhật':7,'CN':7 };

      for (const existing of courseList) {
        if (['completed', 'cancelled'].includes(existing.status)) continue;

        // Lấy lịch của lớp đang dạy
        const eSchedules = Array.isArray(existing.schedules) ? existing.schedules : [];
        let eDays = [];
        if (eSchedules.length > 0) {
          eDays = [...new Set(eSchedules.map(s => s.day_of_week || s.days).filter(Boolean))];
        } else if (existing.schedule_days) {
          eDays = Array.isArray(existing.schedule_days)
            ? existing.schedule_days
            : (() => { try { return JSON.parse(existing.schedule_days); } catch { return existing.schedule_days.split(',').map(s => s.trim()); } })();
        }

        const eTimeSlot = eSchedules[0]?.time_slot || existing.time_slot || '';
        const [eStartStr, eEndStr] = eTimeSlot.split('-').map(s => s?.trim());
        const eStartH = parseInt((eStartStr || '0').split(':')[0], 10);
        const eEndH = parseInt((eEndStr || '0').split(':')[0], 10) || (eStartH + 2);

        const eStart = existing.start_date || eSchedules[0]?.start_time;
        const eEnd = existing.end_date || eSchedules[0]?.end_time;
        const eStartDate = eStart ? new Date(eStart) : null;
        const eEndDate = eEnd ? new Date(eEnd) : (eStartDate ? new Date(eStartDate.getTime() + 365 * 24 * 3600 * 1000) : null);

        if (eDays.length === 0) continue;

        // 1. Kiểm tra trùng khoảng ngày
        if (newStartDate && eStartDate && eEndDate) {
          const dateOverlap = newStartDate <= eEndDate && (newEndDate || newStartDate) >= eStartDate;
          if (!dateOverlap) continue;
        }

        // 2. Kiểm tra trùng thứ
        const commonDays = newDays.filter(d => eDays.includes(d));
        if (commonDays.length === 0) continue;

        // 3. Kiểm tra trùng khung giờ
        const timeOverlap = newStartH < eEndH && newEndH > eStartH;
        if (!timeOverlap) continue;

        const sortedDays = commonDays.sort((a, b) => (dayOrder[a] || 99) - (dayOrder[b] || 99));
        return {
          conflict: true,
          message:
            `⚠️ Trùng lịch dạy với lớp "${existing.title}"!\n\n` +
            `📅 Trùng vào: ${sortedDays.join(', ')} — ${eTimeSlot || `${eStartH}:00 - ${eEndH}:00`}\n\n` +
            `Bạn vẫn muốn nhận lớp này?`,
        };
      }

      return { conflict: false };
    } catch (err) {
      console.warn('[ConflictCheck] Lỗi khi kiểm tra trùng lịch:', err);
      return { conflict: false }; // Không chặn nếu API lỗi
    }
  };

  const formatScheduleDays = (scheduleDays) => {
    if (!scheduleDays) return 'Chưa cập nhật';
    try {
      let days = scheduleDays;
      if (typeof scheduleDays === 'string') {
        days = JSON.parse(scheduleDays);
      }
      if (Array.isArray(days)) {
        return days.join(', ');
      }
    } catch (e) {
      return scheduleDays;
    }
    return 'Chưa cập nhật';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa cập nhật';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch (e) {
      return dateString;
    }
  };

  // Lọc danh sách theo từ khóa tìm kiếm (tìm theo tên lớp hoặc tên môn học)
  const currentList = activeTab === 'student' ? proposedClasses : adminSuggestions;
  const filteredList = currentList.filter(item => {
    const titleMatch = item.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const catName = getCategoryName(item.category_id).toLowerCase();
    const catMatch = catName.includes(searchTerm.toLowerCase());
    return titleMatch || catMatch;
  });

  const totalPending = currentList.length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm kiếm theo tên lớp hoặc tên môn học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filterTabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'student' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('student')}
          >
            Yêu cầu từ học sinh
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'admin' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Đề xuất từ Admin 
            {adminSuggestions.length > 0 && (
              <span className={styles.tabBadge}>{adminSuggestions.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Title */}
      <h2 className={styles.sectionTitle}>
        {activeTab === 'student' 
          ? 'Lớp tạo theo nhu cầu từ học sinh'
          : `Đề xuất từ Admin (${totalPending} lớp chờ nhận)`
        }
      </h2>

      {/* Loading & Content */}
      {(loading || loadingSuggestions) ? (
        <p className={styles.emptyText}>Đang tải danh sách lớp học...</p>
      ) : filteredList.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            {activeTab === 'student' ? '📭' : '🎯'}
          </div>
          <p className={styles.emptyText}>
            {activeTab === 'student'
              ? 'Không có lớp nào từ học sinh'
              : 'Chưa có đề xuất nào từ Admin'
            }
          </p>
        </div>
      ) : (
        <div className={styles.classList}>
          {filteredList.map((item, index) => {
            const isAdminSuggestion = activeTab === 'admin';
            const isAssigned = isAdminSuggestion && item.tutor_id;
            
            return (
              <div key={item.request_id || item.course_id || item.id || index} className={styles.classCard}>
                <div>
                  <div className={styles.cardHeader}>
                    <span className={styles.badge}>
                      {isAdminSuggestion ? '📩 Admin' : '📝 Học sinh'}
                    </span>
                    {isAdminSuggestion && (
                      <span className={`${styles.statusBadge} ${isAssigned ? styles.statusAssigned : styles.statusAvailable}`}>
                        {isAssigned ? '✅ Đã có gia sư nhận' : '🟢 Chờ nhận'}
                      </span>
                    )}
                  </div>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardMeta}>
                    <strong>Cấp học:</strong> {item.grade_level || item.level || 'Chưa cập nhật'}
                  </p>
                  <p className={styles.cardMeta}>
                    <strong>Môn học:</strong> {getCategoryName(item.category_id)}
                  </p>
                  <p className={styles.cardMeta}>
                    <strong>Lịch học:</strong> {formatScheduleDays(item.schedule_days)}
                  </p>
                  <p className={styles.cardMeta}>
                    <strong>Giờ học:</strong> {item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : (item.time_slot || 'Chưa cập nhật')}
                  </p>
                  <p className={styles.cardMeta}>
                    <strong>Số học sinh tối đa:</strong> {item.max_student || item.max_students || 1} học sinh
                  </p>
                  <p className={styles.cardMeta}>
                    <strong>Ngày bắt đầu:</strong> {formatDate(item.start_date)}
                  </p>
                  <p className={styles.cardMeta}>
                    <strong>Số tuần:</strong> {item.total_weeks} tuần
                  </p>
                  <p className={styles.cardDesc}>{item.description || 'Không có mô tả'}</p>
                  <p className={styles.price}>
                    {Number(item.price_per_session || 0).toLocaleString('vi-VN')} VNĐ / buổi
                  </p>
                </div>

                <button
                  className={`${styles.detailBtn} ${isAdminSuggestion && isAssigned ? styles.btnDisabled : ''}`}
                  onClick={() => {
                    if (isAdminSuggestion && isAssigned) {
                      alert('Lớp này đã có gia sư nhận rồi!');
                      return;
                    }
                    setSelectedClass(item);
                  }}
                  disabled={isAdminSuggestion && isAssigned}
                >
                  {isAdminSuggestion && isAssigned ? 'Đã có gia sư nhận' : 'Xem chi tiết'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Chi tiết */}
      {selectedClass && (
        <div className={styles.modalOverlay} onClick={() => setSelectedClass(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedClass(null)}>&times;</button>
            
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedClass.title}</h2>
              <span className={styles.badge}>
                {activeTab === 'admin' ? '📩 Đề xuất từ Admin' : '📝 Yêu cầu từ học sinh'}
              </span>
            </div>

            <div style={{ marginTop: '15px' }}>
              <div className={styles.modalGroup}>
                <strong>Cấp học:</strong> {selectedClass.grade_level || selectedClass.level || 'Chưa cập nhật'}
              </div>
              <div className={styles.modalGroup}>
                <strong>Môn học:</strong> {getCategoryName(selectedClass.category_id)}
              </div>
              <div className={styles.modalGroup}>
                <strong>Lịch học:</strong> {formatScheduleDays(selectedClass.schedule_days)}
              </div>
              <div className={styles.modalGroup}>
                <strong>Giờ học:</strong> {selectedClass.start_time && selectedClass.end_time ? `${selectedClass.start_time} - ${selectedClass.end_time}` : (selectedClass.time_slot || 'Chưa cập nhật')}
              </div>
              <div className={styles.modalGroup}>
                <strong>Số học sinh tối đa:</strong> {selectedClass.max_student || selectedClass.max_students || 1} học sinh
              </div>
              <div className={styles.modalGroup}>
                <strong>Ngày bắt đầu:</strong> {formatDate(selectedClass.start_date)}
              </div>
              <div className={styles.modalGroup}>
                <strong>Số tuần:</strong> {selectedClass.total_weeks} tuần
              </div>
              <div className={styles.modalGroup}>
                <strong>Học phí:</strong> {Number(selectedClass.price_per_session || 0).toLocaleString('vi-VN')} VNĐ / buổi
              </div>
              <div className={styles.modalGroup}>
                <strong>Mô tả:</strong> {selectedClass.description || 'Không có mô tả'}
              </div>
              {activeTab === 'admin' && selectedClass.suggested_at && (
                <div className={styles.modalGroup}>
                  <strong>Đề xuất lúc:</strong> {new Date(selectedClass.suggested_at).toLocaleString('vi-VN')}
                </div>
              )}
            </div>

            {/* Nút hành động */}
            {activeTab === 'student' ? (
              <button
                className={styles.applyBtn}
                disabled={submitting}
                onClick={() => handleApplyClass(selectedClass.request_id || selectedClass.requests_id || selectedClass.id)}
              >
                {submitting ? 'Đang xử lý...' : 'Nhận dạy'}
              </button>
            ) : (
              <button
                className={`${styles.applyBtn} ${selectedClass.tutor_id ? styles.btnDisabled : ''}`}
                disabled={submitting || selectedClass.tutor_id}
                onClick={() => handleAcceptSuggestion(selectedClass)}
              >
                {selectedClass.tutor_id 
                  ? '❌ Lớp đã có gia sư' 
                  : submitting ? 'Đang xử lý...' : 'Nhận lớp'
                }
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}