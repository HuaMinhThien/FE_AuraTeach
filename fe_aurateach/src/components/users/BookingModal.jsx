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
  onSuccess, 
  loading 
}) {
  const [notes, setNotes] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false); 
  const [bookingData, setBookingData] = useState(null);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); // 🔒 Khóa trạng thái khi đã thanh toán thành công
  const [error, setError] = useState(null);

  const formatPrice = (price) => {
    if (!price) return "0";
    return String(price).replace(/[^0-9]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  };

  const handleConfirmBooking = async () => {
    if (isSuccess) return;
    setError(null);
    setIsBookingLoading(true);
    
    try {
      const result = await onConfirm(notes, 'qr');
      
      if (result && result.success) {
        setBookingData(result.data);
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
    if (isSuccess) return; // Chống gọi lặp lại nhiều lần
    setIsSuccess(true); // 🔒 Khóa cứng giao diện ngay khi thành công
    setShowPaymentModal(false);
    onClose();
    
    // 1️⃣ Gọi callback truyền từ component cha (nếu có)
    if (typeof onSuccess === 'function') {
      onSuccess();
    }

    // 2️⃣ Thông báo và reload lại trang để khóa lớp và cập nhật dữ liệu mới nhất từ DB
    setTimeout(() => {
      alert('🎉 Đăng ký thành công! Khóa học đã được thanh toán và cập nhật.');
      window.location.reload(); 
    }, 300);
  };

  const handlePaymentClose = async () => {
    if (isSuccess) return; // Nếu đã thành công thì không hủy booking nữa
    setShowPaymentModal(false);
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
    if (isBookingLoading || isSuccess) return;
    if (showPaymentModal) {
      return;
    }
    onClose();
  };

  const totalSessions = course?.totalSessions || (course?.total_weeks || 12) * (course?.sessionsPerWeek || 1);
  const hourlyRate = course?.price_per_session || course?.price_per_session || 0;
  const calculatedTotalPrice = hourlyRate * totalSessions;

  return (
    <>
      <div className="booking-modal-overlay" onClick={handleClose}>
        <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
          <div className="booking-modal-header">
            <h2 className="booking-modal-title">Xác nhận đăng ký học</h2>
            <button 
              className="booking-modal-close" 
              onClick={handleClose}
              disabled={isBookingLoading || showPaymentModal || isSuccess}
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="booking-error-message">
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}

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
              <p className="booking-course-tutor">{tutorName || "Gia sư"}</p>
              <div className="booking-course-meta">
                <span className="booking-meta-item">
                  📅 {
                    Array.isArray(course?.schedules) && course.schedules.length > 0
                      ? [...new Set(course.schedules.map(s => s.day_of_week || s.days).filter(Boolean))].join(", ")
                      : (course?.schedule_days || "Chưa cập nhật lịch")
                  }
                </span>
                <span className="booking-meta-item">
                  ⏰ {
                    course?.schedules?.[0]?.time_slot || course?.time_slot || "Chưa cập nhật giờ"
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="booking-payment-section">
            <h4 className="booking-section-title">Phương thức thanh toán</h4>
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

          <div className="booking-price-summary">
            <div className="booking-price-row">
              <span>Học phí / buổi</span>
              <span className="booking-price-value">{formatPrice(hourlyRate)}</span>
            </div>
            <div className="booking-price-row">
              <span>Số buổi dự kiến</span>
              <span>{totalSessions} buổi</span>
            </div>
            <div className="booking-price-row total">
              <span>Tổng cộng</span>
              <span className="booking-total-price">
                {formatPrice(calculatedTotalPrice)}
              </span>
            </div>
          </div>

          <div className="booking-notes-section">
            <label className="booking-notes-label">Ghi chú cho gia sư (tùy chọn)</label>
            <textarea
              className="booking-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú của bạn..."
              rows={3}
              disabled={isBookingLoading || isSuccess}
            />
          </div>

          <div className="booking-actions">
            <button 
              className="booking-cancel-btn" 
              onClick={handleClose}
              disabled={isBookingLoading || isSuccess}
            >
              Hủy
            </button>
            <button 
              className="booking-confirm-btn" 
              onClick={handleConfirmBooking}
              disabled={isBookingLoading || isSuccess || !course}
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

          <div className="booking-note">
            <p>💡 <em>Sau khi xác nhận, bạn sẽ được chuyển đến trang thanh toán QR Code.</em></p>
          </div>
        </div>
      </div>

      {showPaymentModal && bookingData && (
        <PaymentModal
          course={{
            ...course,
            totalSessions,
            calculatedTotalPrice
          }}
          subscriptionId={bookingData.payment_id || bookingData.subscription_id} 
          studentId={bookingData.student_id || course?.student_id}
          amount={bookingData.amount || calculatedTotalPrice}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          paymentService={paymentService}
        />
      )}
    </>
  );
}