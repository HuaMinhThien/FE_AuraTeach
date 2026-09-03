"use client";

import Image from "next/image";
import { useState } from "react";
import apiClient from "@/services/apiClient";
import "../../css/student-style/bookingDetailModal.css";
import { useRouter } from "next/navigation"; // <-- Thêm dòng này vào

export default function BookingDetailModal({ 
  course, 
  tutorName, 
  tutorInfo,
  onClose,
  onJoinClass,
  onRating,
  alreadyReviewed,
  studentId
}) {

  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [joining, setJoining] = useState(false);

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

  const handleReportTutor = () => {
    if (!course?.tutor_id) {
      alert('❌ Không tìm thấy thông tin gia sư để báo cáo');
      return;
    }
    onClose();
    // ✅ Chuyển đến trang báo cáo với tutorId và courseId
    router.push(`/report-tutor/${course.tutor_id}?courseId=${course.course_id || course.id}`);
  };

  // 🚀 Xử lý gọi API ghi nhận học viên vào phòng học / gọi link meet từ Backend
  const handleJoinClick = async () => {
    try {
      setJoining(true);
      const courseId = course?.course_id || course?.id;
      
      // Gọi API báo cáo hành động tham gia lớp học lên Laravel Backend (nếu cần log lịch sử học tập)
      await apiClient.post(`/courses/${courseId}/join`).catch(() => {
        // Bỏ qua lỗi ngầm nếu backend chưa dựng sẵn endpoint log này, vẫn cho mở link học
      });

      // Lấy URL phòng học (ưu tiên permanent_room_url hoặc meeting_url)
      const meetUrl = course?.permanent_room_url || course?.meeting_url;
      if (meetUrl) {
        if (typeof onJoinClass === 'function') {
          onJoinClass(meetUrl);
        } else {
          window.open(meetUrl, '_blank');
        }
      } else {
        alert("Phòng học trực tuyến chưa được cập nhật đường dẫn!");
      }
    } catch (error) {
      console.error("Lỗi khi tham gia lớp học:", error);
      alert("Không thể kết nối tới phòng học lúc này.");
    } finally {
      setJoining(false);
    }
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
              <h4 className="detail-section-title">Thông tin gia sư</h4>
              <div className="tutor-info-grid">
                <div className="tutor-info-item">
                  <span className="tutor-info-label">Học vấn</span>
                  <span className="tutor-info-value">{tutorInfo.qualification || "Chưa cập nhật"}</span>
                </div>
                <div className="tutor-info-item">
                  <span className="tutor-info-label">Kinh nghiệm</span>
                  <span className="tutor-info-value">{tutorInfo.Experience || tutorInfo.experience || "Chưa cập nhật"}</span>
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
            <h4 className="detail-section-title">Thông tin khóa học</h4>
            <div className="detail-info-grid">
              <div className="detail-info-item">
                <span className="detail-info-label">Mã lớp</span>
                <span className="detail-info-value">{course?.course_id || course?.id || "N/A"}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Trình độ</span>
                <span className="detail-info-value">{course?.level || "Chưa cập nhật"}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Học phí / giờ</span>
                <span className="detail-info-value price">{formatPrice(course?.price_per_session || course?.price)}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Số buổi</span>
                <span className="detail-info-value">{course?.total_weeks || course?.total_sessions || course?.schedules?.length || 0} buổi</span>
              </div>

              {/* Lấy từ bảng course_schedules (thường là phần tử đầu tiên hoặc map ra) */}
              <div className="detail-info-item">
                <span className="detail-info-label">Thời gian</span>
                <span className="detail-info-value">
                  {course?.schedules?.[0]?.time_slot || course?.time_slot || "Chưa cập nhật"}
                </span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Lịch học</span>
                <span className="detail-info-value">
                  {(() => {
                    const schedules = course?.schedules;
                    if (Array.isArray(schedules) && schedules.length > 0) {
                      // Định nghĩa trọng số để sắp xếp thứ tự các ngày trong tuần
                      const dayOrder = {
                        "Thứ 2": 2, "Thứ Hai": 2,
                        "Thứ 3": 3, "Thứ Ba": 3,
                        "Thứ 4": 4, "Thứ Tư": 4,
                        "Thứ 5": 5, "Thứ Năm": 5,
                        "Thứ 6": 6, "Thứ Sáu": 6,
                        "Thứ 7": 7, "Thứ Bảy": 7,
                        "Chủ Nhật": 8, "CN": 8
                      };

                      // Lấy danh sách các ngày, lọc bỏ giá trị rỗng và sắp xếp theo thứ tự tuần
                      const sortedDays = schedules
                        .map(s => s.day_of_week)
                        .filter(Boolean)
                        .sort((a, b) => (dayOrder[a] || 99) - (dayOrder[b] || 99));

                      return sortedDays.length > 0 ? sortedDays.join(", ") : "Chưa cập nhật";
                    }
                    return course?.day_of_week || "Chưa cập nhật";
                  })()}
                </span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Ngày bắt đầu</span>
                <span className="detail-info-value">
                  {course?.start_time 
                    ? new Date(course.start_time).toLocaleDateString('vi-VN') 
                    : (course?.schedules?.[0]?.start_time 
                        ? new Date(course.schedules[0].start_time).toLocaleDateString('vi-VN') 
                        : "Chưa cập nhật")}
                </span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Ngày kết thúc</span>
                <span className="detail-info-value">
                  {course?.end_time 
                    ? new Date(course.end_time).toLocaleDateString('vi-VN') 
                    : (course?.schedules?.[0]?.end_time 
                        ? new Date(course.schedules[0].end_time).toLocaleDateString('vi-VN') 
                        : "Chưa cập nhật")}
                </span>
              </div>

              <div className="detail-info-item full-width">
                <span className="detail-info-label">Số lượng học viên</span>
                <span className="detail-info-value">
                  {Array.isArray(course?.students) ? course.students.length : (course?.current_students || 0)}/{course?.max_students || 0}
                </span>
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
              Tố cáo gia sư
            </button>
                        <div className="detail-action-right">
              {onRating && (
                alreadyReviewed ? (
                  <button className="detail-rating-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    ✅ Đã đánh giá
                  </button>
                ) : (
                  <button className="detail-rating-btn" onClick={() => onRating(course)}>
                    ⭐ Đánh giá
                  </button>
                )
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
                  {course?.status === 'closed' ? 'Lớp đã đóng' : 'Chờ duyệt'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}