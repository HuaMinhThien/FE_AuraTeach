"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import "../../css/student-style/bookingDetailModal.css";

export default function BookingDetailModal({ 
  course, 
  tutorName, 
  tutorInfo,
  onClose,
  onJoinClass,
  onRating,
  studentId
}) {

  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  const formatPrice = (price) => {
    if (!price) return "0";
    return String(price).replace(/[^0-9]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  };

  const getStatusClass = (status) => {
    const statusMap = {
      'active': 'status-active',
      'closed': 'status-closed',
      'pending': 'status-pending'
    };
    return statusMap[status] || 'status-active';
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'active': 'Đang mở',
      'closed': 'Đã đóng',
      'pending': 'Chờ duyệt'
    };
    return statusMap[status] || status;
  };

  // ✅ Hàm xử lý tố cáo gia sư - Chuyển đến trang báo cáo với courseId
  const handleReportTutor = () => {
    if (!course?.tutor_id) {
      alert('❌ Không tìm thấy thông tin gia sư để báo cáo');
      return;
    }
    onClose();
    // ✅ Chuyển đến trang báo cáo với tutorId và courseId
    router.push(`/report-tutor/${course.tutor_id}?courseId=${course.course_id || course.id}`);
  };

  if (!course) {
    return (
      <div className="booking-detail-modal-overlay" onClick={onClose}>
        <div className="booking-detail-modal">
          <div className="booking-detail-body">
            <p>Không tìm thấy thông tin lớp học</p>
            <button onClick={onClose}>Đóng</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-detail-modal-overlay" onClick={onClose}>
      <div className="booking-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="booking-detail-header">
          <h2 className="booking-detail-title">📚 Chi tiết lớp học</h2>
          <button className="booking-detail-close" onClick={onClose}>✕</button>
        </div>

        <div className="booking-detail-body">
          {/* Course Info */}
          <div className="booking-detail-course">
            <div className="booking-detail-thumb">
              {course?.thumbnail && !imageError ? (
                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                  <Image 
                    src={course.thumbnail} 
                    alt={course.title || "Course thumbnail"}
                    fill
                    style={{ objectFit: 'cover', borderRadius: '12px' }}
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="booking-detail-thumb-placeholder">📚</div>
              )}
            </div>
            <div className="booking-detail-course-info">
              <h3 className="booking-detail-course-name">{course?.title || "Không có tên"}</h3>
              <div className="booking-detail-course-meta">
                <span className="detail-meta-item">👨‍🏫 {tutorName || "Gia sư"}</span>
                <span className={`detail-status-badge ${getStatusClass(course?.status)}`}>
                  {getStatusLabel(course?.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Tutor Info */}
          {tutorInfo && (
            <div className="booking-detail-tutor">
              <h4 className="detail-section-title"> Thông tin gia sư</h4>
              <div className="tutor-info-grid">
                <div className="tutor-info-item">
                  <span className="tutor-info-label">Học vấn</span>
                  <span className="tutor-info-value">{tutorInfo.qualification || "Chưa cập nhật"}</span>
                </div>
                <div className="tutor-info-item">
                  <span className="tutor-info-label">Kinh nghiệm</span>
                  <span className="tutor-info-value">{tutorInfo.Experience || "Chưa cập nhật"}</span>
                </div>
                <div className="tutor-info-item">
                  <span className="tutor-info-label">Đánh giá</span>
                  <span className="tutor-info-value">⭐ {tutorInfo.rating || 0}/5</span>
                </div>
                <div className="tutor-info-item">
                  <span className="tutor-info-label">Xác minh</span>
                  <span className="tutor-info-value">{tutorInfo.verification_status || "Chưa cập nhật"}</span>
                </div>
              </div>
              {tutorInfo.bio && (
                <div className="tutor-bio">
                  <span className="tutor-info-label">Giới thiệu</span>
                  <p className="tutor-bio-text">{tutorInfo.bio}</p>
                </div>
              )}
            </div>
          )}

          {/* Course Details */}
          <div className="booking-detail-info">
            <h4 className="detail-section-title"> Thông tin khóa học</h4>
            <div className="detail-info-grid">
              <div className="detail-info-item">
                <span className="detail-info-label">Mã lớp</span>
                <span className="detail-info-value">{course?.course_id || "N/A"}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Trình độ</span>
                <span className="detail-info-value">{course?.level || "Chưa cập nhật"}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Học phí / giờ</span>
                <span className="detail-info-value price">{formatPrice(course?.hourly_rate)}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Số buổi</span>
                <span className="detail-info-value">{course?.total_weeks || 0} buổi</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Thời gian</span>
                <span className="detail-info-value">{course?.time_slot || "Chưa cập nhật"}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Lịch học</span>
                <span className="detail-info-value">{course?.schedule_days?.join(", ") || "Chưa cập nhật"}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Ngày bắt đầu</span>
                <span className="detail-info-value">{course?.start_date ? new Date(course.start_date).toLocaleDateString('vi-VN') : "Chưa cập nhật"}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Ngày kết thúc</span>
                <span className="detail-info-value">{course?.end_date ? new Date(course.end_date).toLocaleDateString('vi-VN') : "Chưa cập nhật"}</span>
              </div>
              <div className="detail-info-item full-width">
                <span className="detail-info-label">Số lượng học viên</span>
                <span className="detail-info-value">{course?.students?.length || 0}/{course?.max_students || 0}</span>
              </div>
              <div className="detail-info-item full-width">
                <span className="detail-info-label">Mô tả</span>
                <span className="detail-info-value description">{course?.description || "Chưa có mô tả"}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="booking-detail-actions">
            <button className="detail-report-btn" onClick={handleReportTutor}>
               Báo cáo gia sư
            </button>
                        <div className="detail-action-right">
              {onRating && (
                <button className="detail-rating-btn" onClick={() => onRating(course)}>
                   Đánh giá
                </button>
              )}
              <button className="detail-close-btn" onClick={onClose}>
                Đóng
              </button>

              {course?.permanent_room_url && course?.status === 'active' && (
                <button 
                  className="detail-join-btn"
                  onClick={() => onJoinClass(course.permanent_room_url)}
                >
                  Tham gia lớp học
                </button>
              )}
              {course?.status !== 'active' && (
                <button className="detail-join-btn disabled" disabled>
                  {course?.status === 'closed' ? ' Lớp đã đóng' : ' Chờ duyệt'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}