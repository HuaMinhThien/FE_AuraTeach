// src/components/users/PaymentModal.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import '@/css/student-style/paymentModal.css';

export default function PaymentModal({ 
  course, 
  bookingId, 
  studentId, 
  amount,
  onClose, 
  onSuccess,
  paymentService 
}) {
  const [qrCode, setQrCode] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [status, setStatus] = useState('pending');
  const [expiryTime, setExpiryTime] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const formatPrice = (price) => {
    if (!price) return '0đ';
    return String(price).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
  };

  const formatCountdown = (expiryDate) => {
    const now = new Date();
    const diff = new Date(expiryDate) - now;
    if (diff <= 0) return 'Đã hết hạn';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCreateQR = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await paymentService.createQR(bookingId, studentId, amount);
      
      if (result.success) {
        const data = result.data;
        setQrCode(data.qr_code);
        setPaymentId(data.payment_id);
        setStatus(data.status);
        setExpiryTime(data.expiry_at);
        setCountdown(formatCountdown(data.expiry_at));

        // Bắt đầu poll check status
        startPolling(data.payment_id);
      } else {
        setError(result.message || 'Không thể tạo mã QR');
      }
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (paymentId) => {
    // Poll mỗi 3 giây
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await paymentService.checkStatus(paymentId);
        if (result.success) {
          setStatus(result.status);
          
          if (result.status === 'paid') {
            // Thanh toán thành công
            clearInterval(pollIntervalRef.current);
            clearInterval(countdownIntervalRef.current);
            onSuccess();
          } else if (result.status === 'expired') {
            // Hết hạn
            clearInterval(pollIntervalRef.current);
            clearInterval(countdownIntervalRef.current);
            setError('Mã QR đã hết hạn. Vui lòng thử lại.');
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 3000);
  };

  // Cập nhật countdown mỗi giây
  useEffect(() => {
    if (expiryTime) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        const newCountdown = formatCountdown(expiryTime);
        setCountdown(newCountdown);
        
        if (newCountdown === 'Đã hết hạn' && status === 'pending') {
          clearInterval(countdownIntervalRef.current);
          clearInterval(pollIntervalRef.current);
          setError('Mã QR đã hết hạn. Vui lòng thử lại.');
        }
      }, 1000);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [expiryTime]);

  // Tạo QR khi mount
  useEffect(() => {
    handleCreateQR();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    setStatus('pending');
    setQrCode(null);
    setPaymentId(null);
    setExpiryTime(null);
    setCountdown('');
    handleCreateQR();
  };

  const getStatusMessage = () => {
    if (status === 'paid') {
      return {
        icon: '✅',
        text: 'Thanh toán thành công!',
        className: 'status-success'
      };
    } else if (status === 'pending') {
      return {
        icon: '⏳',
        text: 'Đang chờ thanh toán...',
        className: 'status-pending'
      };
    } else if (status === 'expired') {
      return {
        icon: '⏰',
        text: 'Mã QR đã hết hạn',
        className: 'status-expired'
      };
    }
    return {
      icon: 'ℹ️',
      text: 'Đang xử lý...',
      className: 'status-loading'
    };
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="payment-modal-header">
          <h2 className="payment-modal-title">💳 Thanh toán QR Code</h2>
          <button className="payment-modal-close" onClick={onClose} disabled={status === 'paid'}>
            ✕
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="payment-loading">
            <div className="payment-spinner"></div>
            <p>Đang tạo mã QR...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="payment-error">
            <p className="payment-error-icon">❌</p>
            <p className="payment-error-text">{error}</p>
            <button className="payment-retry-btn" onClick={handleRetry}>
              Thử lại
            </button>
          </div>
        )}

        {/* QR Display */}
        {!loading && !error && qrCode && (
          <>
            <div className="payment-course-info">
              <h3 className="payment-course-title">{course?.title || 'Khóa học'}</h3>
              <p className="payment-amount">Số tiền: <strong>{formatPrice(amount)}</strong></p>
            </div>

            <div className="payment-qr-container">
              <div className="payment-qr-wrapper">
                <img 
                  src={qrCode} 
                  alt="QR Code thanh toán" 
                  className="payment-qr-image"
                  onError={(e) => {
                    e.target.src = '/img/qr-placeholder.png';
                  }}
                />
              </div>

              <div className={`payment-status ${statusInfo.className}`}>
                <span className="payment-status-icon">{statusInfo.icon}</span>
                <span className="payment-status-text">{statusInfo.text}</span>
              </div>

              {status === 'pending' && (
                <div className="payment-countdown">
                  <span>⏱️ Thời gian còn lại: </span>
                  <span className="payment-countdown-timer">{countdown}</span>
                </div>
              )}

              {status === 'pending' && (
                <div className="payment-instructions">
                  <p>📌 <strong>Hướng dẫn thanh toán:</strong></p>
                  <ol>
                    <li>Mở ứng dụng ngân hàng trên điện thoại</li>
                    <li>Chọn chức năng quét mã QR</li>
                    <li>Quét mã QR hiển thị bên trên</li>
                    <li>Xác nhận thanh toán số tiền <strong>{formatPrice(amount)}</strong></li>
                    <li>Chờ hệ thống xác nhận (tự động)</li>
                  </ol>
                </div>
              )}

              {status === 'paid' && (
                <div className="payment-success-actions">
                  <button className="payment-done-btn" onClick={onClose}>
                    ✅ Hoàn tất
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}