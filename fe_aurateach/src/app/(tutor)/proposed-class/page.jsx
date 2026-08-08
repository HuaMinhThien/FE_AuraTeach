// src/app/(tutor)/proposed-class/page.jsx - CẬP NHẬT
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './proposed-class.module.css';

// Hàm hỗ trợ đọc cookie user_info
function getUserInfoFromCookie() {
  if (typeof document === 'undefined') return null;
  const cookieArr = document.cookie.split(';');
  for (let i = 0; i < cookieArr.length; i++) {
    const cookiePair = cookieArr[i].split('=');
    if (cookiePair[0].trim() === 'user_info') {
      try {
        const decodedValue = decodeURIComponent(cookiePair[1]);
        return JSON.parse(decodedValue);
      } catch (e) {
        console.error("Lỗi khi giải mã cookie user_info:", e);
        return null;
      }
    }
  }
  return null;
}

export default function ProposedClassPage() {
  const router = useRouter();
  const [currentTutorId, setCurrentTutorId] = useState(null);

  // Tab: 'student' | 'admin'
  const [activeTab, setActiveTab] = useState('student');

  // Lớp từ học sinh
  const [proposedClasses, setProposedClasses] = useState([]);
  const [pendingClasses, setPendingClasses] = useState([]);
  
  // Lớp từ admin
  const [adminSuggestions, setAdminSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const userInfo = getUserInfoFromCookie();
    if (userInfo && userInfo.user_id) {
      setCurrentTutorId(userInfo.user_id);
    }
  }, []);

  // Fetch dữ liệu khi currentTutorId hoặc activeTab thay đổi
  useEffect(() => {
    if (currentTutorId) {
      if (activeTab === 'student') {
        fetchStudentClasses(currentTutorId);
      } else {
        fetchAdminSuggestions(currentTutorId);
      }
    }
  }, [currentTutorId, activeTab]);

  // Fetch lớp từ học sinh
  const fetchStudentClasses = async (tutorId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/student-class-requests?tutor_id=${tutorId}`);
      if (res.ok) {
        const data = await res.json();
        setProposedClasses(data.proposed_classes || []);
        setPendingClasses(data.pending_classes || []);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp từ học sinh:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch đề xuất từ admin
  const fetchAdminSuggestions = async (tutorId) => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/tutor/suggestions?tutorId=${tutorId}`);
      if (res.ok) {
        const data = await res.json();
        setAdminSuggestions(data.data || []);
      }
    } catch (error) {
      console.error("Lỗi khi tải đề xuất từ admin:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Đăng ký nhận dạy (lớp từ học sinh)
  const handleApplyClass = async (requestId) => {
    if (!currentTutorId) {
      alert("Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/student-class-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          requests_id: requestId,
          tutor_id: currentTutorId
        })
      });

      const result = await res.json();
      if (result.success) {
        alert("Đã gửi yêu cầu nhận dạy thành công!");
        setSelectedClass(null);
        fetchStudentClasses(currentTutorId);
      } else {
        alert(result.message || "Có lỗi xảy ra, vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi khi nhận dạy:", error);
      alert("Không thể kết nối đến máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  // Nhận lớp đề xuất từ admin (First come first serve)
  const handleAcceptSuggestion = async (course) => {
    if (!currentTutorId) {
      alert("Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại!");
      return;
    }

    if (!confirm(`Bạn có chắc muốn nhận lớp "${course.title}"?`)) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/classes/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.course_id,
          tutorId: currentTutorId
        })
      });

      const result = await res.json();
      if (result.success) {
        alert("🎉 Nhận lớp thành công! Lớp sẽ được hiển thị trên 'Tìm lớp'.");
        setSelectedClass(null);
        fetchAdminSuggestions(currentTutorId);
      } else {
        if (result.alreadyAssigned) {
          alert("⚠️ Lớp đã có tutor khác nhận rồi!");
        } else {
          alert(result.message || "Có lỗi xảy ra, vui lòng thử lại.");
        }
        // Refresh để cập nhật trạng thái
        fetchAdminSuggestions(currentTutorId);
      }
    } catch (error) {
      console.error("Lỗi khi nhận lớp:", error);
      alert("Không thể kết nối đến máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  // Lọc danh sách theo từ khóa
  const currentList = activeTab === 'student' ? proposedClasses : adminSuggestions;
  const filteredList = currentList.filter(item => {
    const titleMatch = item.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const catMatch = item.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return titleMatch || catMatch;
  });

  // Đếm tổng số lớp chờ
  const totalPending = (activeTab === 'student' ? proposedClasses : adminSuggestions).length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm kiếm theo tên lớp hoặc môn học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filterTabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'student' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('student')}
          >
            📝 Yêu cầu từ học sinh
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'admin' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            📩 Đề xuất từ Admin 
            {adminSuggestions.length > 0 && (
              <span className={styles.tabBadge}>{adminSuggestions.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Title */}
      <h2 className={styles.sectionTitle}>
        {activeTab === 'student' 
          ? '📝 Lớp tạo theo nhu cầu từ học sinh'
          : `📩 Đề xuất từ Admin (${totalPending} lớp chờ nhận)`
        }
      </h2>

      {/* Loading */}
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
          {filteredList.map((item) => {
            const isAdminSuggestion = activeTab === 'admin';
            const isAssigned = isAdminSuggestion && item.tutor_id;
            
            return (
              <div key={item.id || item.requests_id} className={styles.classCard}>
                <div>
                  <div className={styles.cardHeader}>
                    <span className={styles.badge}>
                      {isAdminSuggestion ? '📩 Admin' : '📝 Học sinh'}
                    </span>
                    {isAdminSuggestion && (
                      <span className={`${styles.statusBadge} ${isAssigned ? styles.statusAssigned : styles.statusAvailable}`}>
                        {isAssigned ? '✅ Đã có tutor' : '🟢 Chờ nhận'}
                      </span>
                    )}
                  </div>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardMeta}>
                    <strong>Cấp học:</strong> {item.level}
                  </p>
                  <p className={styles.cardMeta}>
                    <strong>Môn học:</strong> {item.category_name || 'Chưa phân loại'}
                  </p>
                  <p className={styles.cardMeta}>
                    <strong>Lịch học:</strong> {item.schedule_days?.join(', ')} ({item.time_slot})
                  </p>
                  <p className={styles.cardMeta}>
                    <strong>Ngày bắt đầu:</strong> {item.start_date}
                  </p>
                  <p className={styles.cardMeta}>
                    <strong>Số tuần:</strong> {item.total_weeks} tuần
                  </p>
                  <p className={styles.cardDesc}>{item.description || 'Không có mô tả'}</p>
                  <p className={styles.price}>
                    {Number(item.price_per_session).toLocaleString('vi-VN')} VNĐ / buổi
                  </p>
                </div>

                <button
                  className={`${styles.detailBtn} ${isAdminSuggestion && isAssigned ? styles.btnDisabled : ''}`}
                  onClick={() => {
                    if (isAdminSuggestion && isAssigned) {
                      alert('Lớp này đã có tutor nhận rồi!');
                      return;
                    }
                    setSelectedClass(item);
                  }}
                  disabled={isAdminSuggestion && isAssigned}
                >
                  {isAdminSuggestion && isAssigned ? 'Đã có tutor' : 'Xem chi tiết'}
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
                <strong>Cấp học:</strong> {selectedClass.level}
              </div>
              <div className={styles.modalGroup}>
                <strong>Môn học:</strong> {selectedClass.category_name || 'Chưa phân loại'}
              </div>
              <div className={styles.modalGroup}>
                <strong>Lịch học:</strong> {selectedClass.schedule_days?.join(', ')} ({selectedClass.time_slot})
              </div>
              <div className={styles.modalGroup}>
                <strong>Ngày bắt đầu:</strong> {selectedClass.start_date}
              </div>
              <div className={styles.modalGroup}>
                <strong>Số tuần:</strong> {selectedClass.total_weeks} tuần
              </div>
              <div className={styles.modalGroup}>
                <strong>Học phí:</strong> {Number(selectedClass.price_per_session).toLocaleString('vi-VN')} VNĐ / buổi
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
                onClick={() => handleApplyClass(selectedClass.requests_id || selectedClass.id)}
              >
                {submitting ? 'Đang xử lý...' : '✅ Nhận dạy'}
              </button>
            ) : (
              <button
                className={`${styles.applyBtn} ${selectedClass.tutor_id ? styles.btnDisabled : ''}`}
                disabled={submitting || selectedClass.tutor_id}
                onClick={() => handleAcceptSuggestion(selectedClass)}
              >
                {selectedClass.tutor_id 
                  ? '❌ Lớp đã có tutor' 
                  : submitting ? 'Đang xử lý...' : '✅ Nhận lớp'
                }
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}