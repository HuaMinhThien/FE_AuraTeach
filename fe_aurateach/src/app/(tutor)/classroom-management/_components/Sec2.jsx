"use client";

import styles from "../management.module.css";

export default function ClassGrid({ classes, loading, pagination, currentPage, setCurrentPage, onSelectClass, onCloseClass, getStatusBadge }) {
  if (loading) {
    return <div className={styles.loadingText}>Đang tải danh sách lớp học...</div>;
  }

  if (classes.length === 0) {
    return <div className={styles.emptyText}>Không tìm thấy lớp học nào phù hợp.</div>;
  }

  return (
    <>
      <div className={styles.classGrid}>
        {classes.map((cls) => (
          // 💡 Dùng course_id làm key theo chuẩn Database
          <div key={cls.course_id} className={styles.classCard}>
            <div>
              <div className={styles.cardHeader}>
                {getStatusBadge(cls.status)}
                <span className={styles.weeksText}>⏳ {cls.total_weeks} tuần</span>
              </div>
              
              {/* 💡 Sửa cls.course_name thành cls.title */}
              <h3 className={styles.className}>{cls.title}</h3>
              
              {/* 💡 Bảng courses không lưu trực tiếp start_date, tạm hiển thị ngày tạo hoặc bỏ qua. Nếu muốn bạn có thể format ngày tạo */}
              <p className={styles.cardInfo}>
                🗓️ Ngày tạo: {new Date(cls.created_at).toLocaleDateString("vi-VN")}
              </p>
              
              {/* 💡 Sửa mảng students?.length thành cột số lượng lấy thẳng từ DB */}
              <p className={styles.cardInfo}>
                👥 Học viên: {cls.current_students} / {cls.max_students} người
              </p>
            </div>
            
            <div className={styles.cardAction}>
              <button className={styles.detailBtn} onClick={() => onSelectClass(cls)}>
                Xem chi tiết
              </button>
              {cls.status === "active" && (
                <button className={styles.closeActionBtn} onClick={() => onCloseClass(cls.course_id)}>
                  Khóa lớp
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Cụm nút bấm Phân trang (Giữ nguyên) */}
      {pagination.totalPages > 1 && (
        <div className={styles.paginationBox}>
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >
            ◀ Trước
          </button>
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <button 
              key={`page-${i + 1}`} 
              className={currentPage === i + 1 ? styles.pagActive : ""}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button 
            disabled={currentPage === pagination.totalPages} 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
          >
            Sau ▶
          </button>
        </div>
      )}
    </>
  );
}