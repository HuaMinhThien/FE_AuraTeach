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
  const [isSuccess, setIsSuccess] = useState(false); 
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
    if (isSuccess) return; 
    setIsSuccess(true); 
    setShowPaymentModal(false);
    onClose();
    
    if (typeof onSuccess === 'function') {
      onSuccess();
    }

    setTimeout(() => {
      alert('🎉 Đăng ký thành công! Khóa học đã được thanh toán và cập nhật.');
      window.location.reload(); 
    }, 300);
  };

  const handlePaymentClose = async () => {
    if (isSuccess) return; 
    setShowPaymentModal(false);
    // Hủy payment theo payment_id — backend sẽ tự cancel subscription tương ứng
    if (bookingData?.booking_id) {
      try {
        await paymentService.cancelPayment(bookingData.booking_id);
      } catch (error) {
        console.error('Cancel payment error:', error);
      }
    }
    onClose();
  };

  const handleClose = () => {
    if (isBookingLoading || isSuccess) return;
    if (showPaymentModal) return;
    onClose();
  };

  const totalSessions = course?.totalSessions || course?.sessions_count || 12;
  const rawPrice = course?.price || course?.totalPrice || course?.calculatedTotalPrice || 72000;
  const hourlyRate = course?.price_per_session || (rawPrice / totalSessions);

  // Số buổi thanh toán kỳ đầu (nếu học theo tháng thì đây là số buổi trong tháng đầu, ví dụ 1 buổi hoặc tùy bạn)
  const payableSessions = course?.firstMonthSessions || 1; 

  // 🔥 CHIA TỶ LỆ HOẶC TÍNH LẠI CHUẨN XÁC KỲ ĐẦU:
  // Nếu bạn muốn lấy chính xác tiền 1 buổi (4.000đ) thì dùng hourlyRate * payableSessions
  // Hoặc nếu rawPrice là tổng cả khóa, ta quy về tiền theo tháng/buổi:
  let calculatedTotalPrice = hourlyRate * payableSessions;

  // Đảm bảo nếu tính ra vượt quá tổng tiền gốc thì lấy tổng gốc, còn không thì lấy tiền kỳ đầu
  if (calculatedTotalPrice > rawPrice) {
      calculatedTotalPrice = rawPrice; 
  }

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
                  <div className="booking-option-desc">Quét mã QR để thanh toán kỳ đầu</div>
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
              <span>Số buổi thanh toán kỳ đầu</span>
              <span>{payableSessions} buổi</span>
            </div>
            <div className="booking-price-row total">
              <span>Tổng thanh toán kỳ đầu</span>
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
            totalSessions: payableSessions,
            calculatedTotalPrice
          }}
          subscriptionId={bookingData.payment_id || bookingData.subscription_id} 
          studentId={bookingData.student_id || course?.student_id}
          // 💡 Ưu tiên lấy amount từ bookingData (nếu backend trả về đúng), 
          // nếu không thì lấy calculatedTotalPrice đã được tính đúng theo kỳ đầu ở trên (4.000đ)
          amount={calculatedTotalPrice}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          paymentService={paymentService}
        />
      )}
    </>
  );
}