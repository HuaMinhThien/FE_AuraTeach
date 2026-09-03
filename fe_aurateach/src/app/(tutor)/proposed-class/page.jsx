"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './proposed-class.module.css';
import { classRequestService } from '@/services/classRequestService';
import { authService } from '@/services/authService';
import { categoryService } from '@/services/categoryService'; // <-- Import service danh mục của bạn
import { adminService } from '@/services/adminService';

export default function ProposedClassPage() {
  const router = useRouter();
  const [currentTutorId, setCurrentTutorId] = useState(null);
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
          setCurrentTutorId(user.user_id || user.id);
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