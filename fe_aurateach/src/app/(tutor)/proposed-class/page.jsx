'use client';

import { useState, useEffect } from 'react';
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
  const [currentTutorId, setCurrentTutorId] = useState(null);

  const [proposedClasses, setProposedClasses] = useState([]);
  const [pendingClasses, setPendingClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('proposed'); // 'proposed' | 'pending'
  const [selectedClass, setSelectedClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Lấy thông tin user_info từ cookie khi trang load
  useEffect(() => {
    const userInfo = getUserInfoFromCookie();
    if (userInfo && userInfo.user_id) {
      setCurrentTutorId(userInfo.user_id);
    }
  }, []);

  // Call API lấy dữ liệu lớp đề xuất và lớp đang chờ duyệt
  const fetchClasses = async (tutorId) => {
    const targetId = tutorId || currentTutorId;
    if (!targetId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/student-class-requests?tutor_id=${targetId}`);
      if (res.ok) {
        const data = await res.json();
        setProposedClasses(data.proposed_classes || []);
        setPendingClasses(data.pending_classes || []);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTutorId) {
      fetchClasses(currentTutorId);
    }
  }, [currentTutorId]);

  // Đăng ký nhận dạy
  const handleApplyClass = async (requestId) => {
    if (!currentTutorId) {
      alert("Không tìm thấy thông tin đăng nhập của gia sư. Vui lòng đăng nhập lại!");
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
        fetchClasses(currentTutorId); // Tải lại danh sách để cập nhật trạng thái
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

  // Lọc theo từ khóa tìm kiếm (tên lớp hoặc môn học)
  const currentList = activeTab === 'proposed' ? proposedClasses : pendingClasses;
  const filteredClasses = currentList.filter(item => {
    const titleMatch = item.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const catMatch = item.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return titleMatch || catMatch;
  });

  return (
    <div className={styles.container}>
      {/* Header section: Thanh tìm kiếm & Các bộ lọc */}
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
            className={`${styles.tabBtn} ${activeTab === 'proposed' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('proposed')}
          >
            Lớp đề xuất
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'pending' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Đang chờ duyệt ({pendingClasses.length})
          </button>
        </div>
      </div>

      {/* Main Section */}
      <h2 className={styles.sectionTitle}>
        {activeTab === 'proposed' ? 'Danh sách lớp tạo theo nhu cầu (Đã lọc trùng lịch)' : 'Các lớp đang chờ duyệt'}
      </h2>

      {loading ? (
        <p className={styles.emptyText}>Đang tải danh sách lớp học...</p>
      ) : filteredClasses.length === 0 ? (
        <p className={styles.emptyText}>Không tìm thấy lớp học phù hợp.</p>
      ) : (
        <div className={styles.classList}>
          {filteredClasses.map((item) => (
            <div key={item.id || item.requests_id} className={styles.classCard}>
              <div>
                <span className={styles.badge}>{item.category_name}</span>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardMeta}><strong>Cấp học:</strong> {item.level}</p>
                <p className={styles.cardDesc}>{item.description || 'Không có mô tả'}</p>
                <p className={styles.price}>
                  {Number(item.price_per_session).toLocaleString('vi-VN')} VNĐ / buổi
                </p>
              </div>

              <button
                className={styles.detailBtn}
                onClick={() => setSelectedClass(item)}
              >
                Xem chi tiết
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Hiện Chi Tiết Lớp Học */}
      {selectedClass && (
        <div className={styles.modalOverlay} onClick={() => setSelectedClass(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedClass(null)}>&times;</button>
            
            <h2 className={styles.modalTitle}>{selectedClass.title}</h2>
            <span className={styles.badge}>{selectedClass.category_name}</span>

            <div style={{ marginTop: '15px' }}>
              <div className={styles.modalGroup}>
                <strong>Cấp học:</strong> {selectedClass.level}
              </div>
              <div className={styles.modalGroup}>
                <strong>Mô tả chi tiết:</strong> {selectedClass.description || 'Không có mô tả'}
              </div>
              <div className={styles.modalGroup}>
                <strong>Học phí:</strong> {Number(selectedClass.price_per_session).toLocaleString('vi-VN')} VNĐ / buổi
              </div>
              <div className={styles.modalGroup}>
                <strong>Thời gian học:</strong> {selectedClass.time_slot} ({selectedClass.schedule_days?.join(', ')})
              </div>
              <div className={styles.modalGroup}>
                <strong>Ngày bắt đầu:</strong> {selectedClass.start_date}
              </div>
              <div className={styles.modalGroup}>
                <strong>Số tuần học:</strong> {selectedClass.total_weeks} tuần
              </div>
              <div className={styles.modalGroup}>
                <strong>Yêu cầu gia sư:</strong> {selectedClass.tutor_level}
              </div>
            </div>

            {/* Nút nhận dạy ở dưới cùng section chi tiết */}
            {activeTab === 'proposed' && (
              <button
                className={styles.applyBtn}
                disabled={submitting}
                onClick={() => handleApplyClass(selectedClass.requests_id || selectedClass.id)}
              >
                {submitting ? 'Đang xử lý...' : 'Nhận dạy'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}