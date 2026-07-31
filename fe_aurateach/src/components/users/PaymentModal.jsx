// src/components/users/PaymentModal.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import '@/css/student-style/paymentModal.css';

export default function PaymentModal({ 
  course, 
  subscriptionId, 
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
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);

  const statusRef = useRef(status);
  statusRef.current = status;

  const pollIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const hasInitializedRef = useRef(false); // 🛡️ Chống chạy hàm createQR 2 lần

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

  const clearAllIntervals = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Khởi tạo QR độc lập, dùng useRef chống gọi lại lần 2
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initQR = async () => {
      if (!subscriptionId) {
        setError("Mã đăng ký khóa học không hợp lệ.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log("🚀 [Init] Đang gọi API tạo QR...");
        const result = await paymentService.createQR(subscriptionId, studentId, amount);
        console.log("✅ [Init] Kết quả tạo QR:", result);
        
        if (result && result.success) {
          const data = result.data;
          setQrCode(data.qr_url);
          setPaymentId(data.payment_id);
          setStatus(data.status || 'pending');
          
          const expiry = data.expiry_at || new Date(Date.now() + 15 * 60000).toISOString();
          setExpiryTime(expiry);
          setCountdown(formatCountdown(expiry));

          if (data.payment_id) {
            startPolling(data.payment_id);
          }
        } else {
          setError(result?.message || 'Không thể tạo mã QR');
        }
      } catch (err) {
        console.error("❌ [Init Error]:", err);
        setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
    };

    initQR();

    return () => {
      clearAllIntervals();
    };
  }, [subscriptionId, studentId, amount, paymentService]);

  // Vòng lặp đếm ngược thời gian hết hạn QR
  useEffect(() => {
    if (!expiryTime) return;

    countdownIntervalRef.current = setInterval(() => {
      const newCountdown = formatCountdown(expiryTime);
      setCountdown(newCountdown);
      
      if (newCountdown === 'Đã hết hạn' && statusRef.current === 'pending') {
        clearAllIntervals();
        setError('Mã QR đã hết hạn. Vui lòng thử lại.');
      }
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [expiryTime]);

  // Vòng lặp Polling kiểm tra trạng thái thanh toán chuẩn xác
  const startPolling = (currentPaymentId) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    console.log("🔄 [Polling Started] Kích hoạt vòng lặp checkStatus mỗi 3s cho ID:", currentPaymentId);

    pollIntervalRef.current = setInterval(async () => {
      if (statusRef.current === 'paid' || statusRef.current === 'expired') {
        console.log("⚠️ [Polling] Trạng thái đã là:", statusRef.current, "-> Hủy vòng lặp.");
        clearAllIntervals();
        return;
      }

      try {
        console.log(`⏳ [Polling Tick] Đang gọi checkStatus lúc ${new Date().toLocaleTimeString()}...`);
        const response = await paymentService.checkStatus(currentPaymentId);
        const result = response?.data?.success !== undefined ? response.data : response;
        
        console.log("📥 [Polling Response]:", result);
        
        if (result && result.success) {
          const currentStatus = result.status;
          setStatus(currentStatus);
          
          if (currentStatus === 'paid') {
            console.log("🎉 [SUCCESS] Thanh toán thành công! Dừng polling và gọi onSuccess.");
            clearAllIntervals();
            if (typeof onSuccess === 'function') {
              onSuccess();
            }
          } else if (currentStatus === 'expired') {
            console.log("⏰ [EXPIRED] Giao dịch hết hạn.");
            clearAllIntervals();
            setError('Mã QR đã hết hạn. Vui lòng thử lại.');
          }
        }
      } catch (err) {
        console.error('❌ [Polling Error]:', err?.response?.data || err.message);
      }
    }, 3000);
  };

  const handleCancelPayment = async () => {
    clearAllIntervals();
    if (!paymentId) {
      onClose();
      return;
    }

    try {
      setCancelling(true);
      if (paymentService.cancelPayment) {
        await paymentService.cancelPayment(paymentId);
      }
    } catch (err) {
      console.error('Lỗi khi hủy giao dịch:', err);
    } finally {
      onClose();
    }
  };

  const handleRetry = () => {
    setError(null);
    setStatus('pending');
    setQrCode(null);
    setPaymentId(null);
    setExpiryTime(null);
    hasInitializedRef.current = false;
    window.location.reload(); // Hoặc gọi lại hàm khởi tạo
  };

  const getStatusMessage = () => {
    if (status === 'paid') {
      return { icon: '✅', text: 'Thanh toán thành công!', className: 'status-success' };
    } else if (status === 'expired') {
      return { icon: '⏰', text: 'Mã QR đã hết hạn', className: 'status-expired' };
    }
    return { icon: '⏳', text: 'Đang chờ thanh toán...', className: 'status-pending' };
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="payment-modal-overlay" onClick={handleCancelPayment}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2 className="payment-modal-title">💳 Thanh toán QR Code</h2>
          <button 
            className="payment-modal-close" 
            onClick={handleCancelPayment} 
            disabled={status === 'paid' || loading || cancelling}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="payment-loading">
            <div className="payment-spinner"></div>
            <p>Đang tạo mã QR...</p>
          </div>
        ) : error ? (
          <div className="payment-error">
            <p className="payment-error-icon">❌</p>
            <p className="payment-error-text">{error}</p>
            <div className="payment-error-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
              <button className="payment-retry-btn" onClick={handleRetry}>
                Thử lại
              </button>
              <button className="payment-cancel-btn" onClick={handleCancelPayment} style={{ background: '#e0e0e0', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                Đóng / Hủy
              </button>
            </div>
          </div>
        ) : (
          qrCode && (
            <>
              <div className="payment-course-info">
                <h3 className="payment-course-title">{course?.title || 'Khóa học'}</h3>
                <p className="payment-amount">Số tiền: <strong>{formatPrice(amount)}</strong></p>
                {subscriptionId && (
                  <p className="payment-booking-id">Mã đăng ký: <strong>{subscriptionId}</strong></p>
                )}
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

                {status !== 'paid' && (
                  <div className="payment-countdown">
                    <span>⏱️ Thời gian còn lại: </span>
                    <span className="payment-countdown-timer">{countdown}</span>
                  </div>
                )}

                {status !== 'paid' && (
                  <div className="payment-action-buttons" style={{ margin: '15px 0', display: 'flex', justifyContent: 'center' }}>
                    <button 
                      onClick={handleCancelPayment}
                      disabled={cancelling}
                      style={{
                        backgroundColor: '#ff4d4f',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'background 0.2s'
                      }}
                    >
                      {cancelling ? 'Đang hủy...' : '🚫 Hủy giao dịch / Để sau'}
                    </button>
                  </div>
                )}

                {status !== 'paid' && (
                  <div className="payment-instructions">
                    <p>📌 <strong>Hướng dẫn thanh toán:</strong></p>
                    <ol>
                      <li>Mở ứng dụng ngân hàng trên điện thoại</li>
                      <li>Chọn chức năng quét mã QR</li>
                      <li>Quét mã QR hiển thị bên trên</li>
                      <li>Xác nhận thanh toán số tiền <strong>{formatPrice(amount)}</strong></li>
                      <li>Hệ thống sẽ tự động xác nhận sau khi chuyển khoản thành công</li>
                      <li>⚠️ <em>Không đóng tab này cho đến khi hệ thống xác nhận hoàn tất</em></li>
                    </ol>
                  </div>
                )}

                {status === 'paid' && (
                  <div className="payment-success-actions">
                    <button className="payment-done-btn" onClick={onSuccess}>
                      ✅ Hoàn tất
                    </button>
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}