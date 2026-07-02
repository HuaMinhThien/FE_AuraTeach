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
    // Luôn trả về pending - KHÔNG TỰ ĐỘNG PAID
    return {
      success: true,
      status: 'pending',
      message: 'Chờ thanh toán. Vui lòng quét QR để thanh toán.'
    };
  }

  // Chỉ dùng cho development - mô phỏng thanh toán thành công
  async manualPay(paymentId) {
    if (process.env.NODE_ENV === 'development') {
      try {
        const response = await fetch(`/api/payments/manual-pay/${paymentId}`, {
          method: 'POST',
        });
        return await response.json();
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