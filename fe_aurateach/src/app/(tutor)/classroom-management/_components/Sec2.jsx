"use client";

import styles from "../management.module.css";

export default function CourseGrid({ courses, loading, pagination, currentPage, setCurrentPage, onSelectCourse, onCloseCourse, getStatusBadge }) {
  if (loading) {
    return <div className={styles.loadingText}>Đang tải danh sách khóa học...</div>;
  }

  const safeCourses = Array.isArray(courses) ? courses : [];

  if (safeCourses.length === 0) {
    return <div className={styles.emptyText}>Không tìm thấy khóa học nào phù hợp.</div>;
  }

  return (
    <>
      <div className={styles.classGrid}>
        {safeCourses.map((crs) => (
          <div key={crs.course_id} className={styles.classCard}>
            <div>
              <div className={styles.cardHeader}>
                {getStatusBadge(crs.status)}
                <span className={styles.weeksText}>⏳ {crs.total_weeks || 0} tuần</span>
              </div>
              <h3 className={styles.className}>{crs.title}</h3>
              <p className={styles.cardInfo}>🗓️ Ngày mở: {crs.start_date}</p>
              <p className={styles.cardInfo}>👥 Học viên đã tham gia: {(crs.students || []).length} người</p>
            </div>
            
            <div className={styles.cardAction}>
              <button className={styles.detailBtn} onClick={() => onSelectCourse(crs)}>
                Xem chi tiết
              </button>
              {crs.status === "active" && (
                <button className={styles.closeActionBtn} onClick={() => onCloseCourse(crs.course_id)}>
                  Khóa khóa học
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

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
              key={i + 1} 
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