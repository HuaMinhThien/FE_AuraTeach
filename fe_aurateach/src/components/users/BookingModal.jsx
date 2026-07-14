// src/components/users/BookingModal.jsx
"use client";

import { useState } from "react";
import Image from "next/image";
import PaymentModal from "./PaymentModal";
import paymentService from "@/services/paymentService";
import "@/css/student-style/bookingModal.css";

export default function BookingModal({ 
  course, 
  tutorName, 
  onClose, 
  onConfirm,
  loading 
}) {
  const [notes, setNotes] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatPrice = (price) => {
    if (!price) return "0";
    return String(price).replace(/[^0-9]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  };

  const handleConfirmBooking = async () => {
    setError(null);
    setIsBookingLoading(true);
    
    try {
      // Gọi API tạo booking
      const result = await onConfirm(notes, 'qr');
      
      if (result && result.success) {
        setBookingData(result.data);
        // Mở Payment Modal
        setShowPaymentModal(true);
      } else {
        setError(result?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Booking error:', error);
      setError('Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsBookingLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    // Booking đã được confirm sau khi thanh toán thành công
    onClose();
    // Hiển thị thông báo thành công
    setTimeout(() => {
      alert('🎉 Đăng ký thành công! Bạn đã được thêm vào lớp học.');
    }, 300);
  };

  const handlePaymentClose = async () => {
    setShowPaymentModal(false);
    // Nếu thanh toán chưa thành công, hủy booking
    if (bookingData && !showPaymentModal) {
      try {
        await paymentService.cancelBooking(bookingData.booking_id);
      } catch (error) {
        console.error('Cancel booking error:', error);
      }
    }
    onClose();
  };

  const handleClose = () => {
    if (isBookingLoading) return;
    if (showPaymentModal) {
      // Nếu đang ở Payment Modal, không cho đóng
      return;
    }
    onClose();
  };

  return (
    <>
      <div className="booking-modal-overlay" onClick={handleClose}>
        <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="booking-modal-header">
            <h2 className="booking-modal-title">Xác nhận đăng ký học</h2>
            <button 
              className="booking-modal-close" 
              onClick={handleClose}
              disabled={isBookingLoading || showPaymentModal}
            >
              ✕
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="booking-error-message">
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}

          {/* Course Info */}
          <div className="booking-course-info">
            <div className="booking-course-thumb">
              {course?.thumbnail ? (
                <Image 
                  src={course.thumbnail} 
                  alt={course.title}
                  width={80}
                  height={80}
                  style={{ objectFit: 'cover', borderRadius: '8px' }}
                />
              ) : (
                <div className="booking-thumb-placeholder">📚</div>
              )}
            </div>
            <div className="booking-course-details">
              <h3 className="booking-course-name">{course?.title}</h3>
              <p className="booking-course-tutor">👨‍🏫 {tutorName || "Gia sư"}</p>
              <div className="booking-course-meta">
                <span className="booking-meta-item">📅 {course?.schedule_days?.join(", ")}</span>
                <span className="booking-meta-item">⏰ {course?.time_slot}</span>
              </div>
            </div>
          </div>

          {/* Payment - QR Only */}
          <div className="booking-payment-section">
            <h4 className="booking-section-title">💳 Phương thức thanh toán</h4>
            <div className="booking-payment-options">
              <label className="booking-payment-option active">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="qr"
                  checked={true}
                  readOnly
                />
                <span className="booking-option-icon">📱</span>
                <div>
                  <div className="booking-option-label">Thanh toán qua QR Code</div>
                  <div className="booking-option-desc">Quét mã QR để thanh toán</div>
                </div>
              </label>
            </div>
          </div>

          {/* Price Summary */}
          <div className="booking-price-summary">
            <div className="booking-price-row">
              <span>Học phí / giờ</span>
              <span className="booking-price-value">{formatPrice(course?.hourly_rate || course?.price_per_session)}</span>
            </div>
            <div className="booking-price-row">
              <span>Số buổi dự kiến</span>
              <span>{course?.total_weeks || 12} buổi</span>
            </div>
            <div className="booking-price-row total">
              <span>Tổng cộng</span>
              <span className="booking-total-price">
                {formatPrice((course?.hourly_rate || course?.price_per_session || 0) * (course?.total_weeks || 12))}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="booking-notes-section">
            <label className="booking-notes-label">Ghi chú cho gia sư (tùy chọn)</label>
            <textarea
              className="booking-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú của bạn..."
              rows={3}
              disabled={isBookingLoading}
            />
          </div>

          {/* Actions */}
          <div className="booking-actions">
            <button 
              className="booking-cancel-btn" 
              onClick={handleClose}
              disabled={isBookingLoading}
            >
              Hủy
            </button>
            <button 
              className="booking-confirm-btn" 
              onClick={handleConfirmBooking}
              disabled={isBookingLoading || !course}
            >
              {isBookingLoading ? (
                <>
                  <span className="booking-spinner"></span>
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận đăng ký"
              )}
            </button>
          </div>

          {/* Note */}
          <div className="booking-note">
            <p>💡 <em>Sau khi xác nhận, bạn sẽ được chuyển đến trang thanh toán QR Code.</em></p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && bookingData && (
        <PaymentModal
          course={course}
          bookingId={bookingData.booking_id}
          studentId={bookingData.student_id || course?.student_id}
          amount={bookingData.amount || course?.hourly_rate}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          paymentService={paymentService}
        />
      )}
    </>
  );
}