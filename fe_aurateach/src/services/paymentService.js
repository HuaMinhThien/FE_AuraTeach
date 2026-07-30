// src/services/paymentService.js
class PaymentService {
  constructor() {
    this.useApi = process.env.NEXT_PUBLIC_USE_API === 'true';
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    this.jsonServerUrl = 'http://localhost:3007';
  }

  async createQR(bookingId, studentId, amount) {
    if (this.useApi) {
      return this.createQRWithApi(bookingId, studentId, amount);
    } else {
      return this.createQRWithJson(bookingId, studentId, amount);
    }
  }

  async createQRWithApi(bookingId, studentId, amount) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/payments/create-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          booking_id: bookingId, 
          student_id: studentId, 
          amount 
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Không thể tạo mã QR');
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  async createQRWithJson(bookingId, studentId, amount) {
    // Tạo QR code thật sử dụng API QR Server
    const qrData = `AURATEACH-${bookingId}-${Date.now()}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`;
    
    return {
      success: true,
      data: {
        payment_id: 'pay_' + Date.now(),
        qr_code: qrCodeUrl,
        expiry_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        status: 'pending',
        amount: amount,
        transaction_id: 'txn_' + Date.now()
      }
    };
  }

  async checkStatus(paymentId) {
    if (this.useApi) {
      return this.checkStatusWithApi(paymentId);
    } else {
      return this.checkStatusWithJson(paymentId);
    }
  }

  async checkStatusWithApi(paymentId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/payments/check-status/${paymentId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Không thể kiểm tra trạng thái');
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  async checkStatusWithJson(paymentId) {
    // Lưu thời điểm bắt đầu vào bộ nhớ tạm
    if (!this._paymentStartTimes) {
      this._paymentStartTimes = {};
    }
    
    // Nếu chưa có thời gian bắt đầu, lưu lại
    if (!this._paymentStartTimes[paymentId]) {
      this._paymentStartTimes[paymentId] = Date.now();
      return {
        success: true,
        status: 'pending',
        message: 'Chờ thanh toán. Vui lòng quét QR để thanh toán.'
      };
    }

    const elapsed = (Date.now() - this._paymentStartTimes[paymentId]) / 1000;
    
    // Sau 15s, tự động chuyển sang paid (demo mode)
    if (elapsed >= 15) {
      // 🔥 Gọi API để cập nhật booking và gửi notifications
      try {
        console.log(`⏰ Auto-pay triggered for payment: ${paymentId}`);
        const res = await fetch(`/api/payments/manual-pay/${paymentId}`, {
          method: 'POST',
        });
        const result = await res.json();
        console.log(`📊 Auto-pay result:`, result);
        
        if (result.success) {
          // Xóa khỏi bộ nhớ tạm
          delete this._paymentStartTimes[paymentId];
          return {
            success: true,
            status: 'paid',
            message: '✅ Thanh toán thành công! (Demo: tự động sau 15s)'
          };
        } else {
          console.error('❌ Auto-pay failed:', result.message);
        }
      } catch (error) {
        console.error('❌ Auto-pay error:', error);
      }
    }

    const remaining = Math.max(0, 15 - Math.round(elapsed));
    return {
      success: true,
      status: 'pending',
      message: `⏳ Chờ thanh toán... Tự động xác nhận sau ${remaining}s (demo)`
    };
  }

  // Chỉ dùng cho development - mô phỏng thanh toán thành công
  async manualPay(paymentId) {
    if (process.env.NODE_ENV === 'development') {
      try {
        const response = await fetch(`/api/payments/manual-pay/${paymentId}`, {
          method: 'POST',
        });
        const result = await response.json();
        
        // Xóa khỏi bộ nhớ tạm nếu thành công
        if (result.success && this._paymentStartTimes) {
          delete this._paymentStartTimes[paymentId];
        }
        
        return result;
      } catch (error) {
        return {
          success: true,
          status: 'paid'
        };
      }
    }
    return {
      success: false,
      message: 'Chỉ dùng trong môi trường development'
    };
  }

  // Hủy booking nếu thanh toán thất bại
  async cancelBooking(bookingId) {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      console.error('Cancel booking error:', error);
      return { success: false };
    }
  }
}

const paymentService = new PaymentService();
export default paymentService;