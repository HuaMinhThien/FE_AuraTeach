"use client";

import { useState } from "react";
import Image from "next/image";

export default function BookingModal({ 
  course, 
  tutorName, 
  onClose, 
  onConfirm,
  loading 
}) {
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wallet");

  const formatPrice = (price) => {
    if (!price) return "0";
    return String(price).replace(/[^0-9]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  };

  return (
    <div className="booking-modal-overlay" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="booking-modal-header">
          <h2 className="booking-modal-title">Xác nhận đăng ký học</h2>
          <button className="booking-modal-close" onClick={onClose}>✕</button>
        </div>

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

        {/* Payment */}
        <div className="booking-payment-section">
          <h4 className="booking-section-title">💳 Phương thức thanh toán</h4>
          <div className="booking-payment-options">
            <label className={`booking-payment-option ${paymentMethod === 'wallet' ? 'active' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="wallet"
                checked={paymentMethod === 'wallet'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="booking-option-icon">💰</span>
              <div>
                <div className="booking-option-label">Ví AuraTeach</div>
                <div className="booking-option-desc">Thanh toán bằng số dư ví</div>
              </div>
            </label>
            <label className={`booking-payment-option ${paymentMethod === 'banking' ? 'active' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="banking"
                checked={paymentMethod === 'banking'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="booking-option-icon">🏦</span>
              <div>
                <div className="booking-option-label">Chuyển khoản ngân hàng</div>
                <div className="booking-option-desc">Thanh toán qua chuyển khoản</div>
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
          />
        </div>

        {/* Actions */}
        <div className="booking-actions">
          <button className="booking-cancel-btn" onClick={onClose} disabled={loading}>
            Hủy
          </button>
          <button 
            className="booking-confirm-btn" 
            onClick={() => onConfirm(notes, paymentMethod)}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="booking-spinner"></span>
                Đang xử lý...
              </>
            ) : (
              "Xác nhận đăng ký"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}