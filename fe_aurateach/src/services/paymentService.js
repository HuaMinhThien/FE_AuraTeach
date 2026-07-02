// src/services/paymentService.js
class PaymentService {
  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    this.useApi = process.env.NEXT_PUBLIC_USE_API === 'true';
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
        body: JSON.stringify({ booking_id: bookingId, student_id: studentId, amount }),
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
    // Mock data cho development
    return {
      success: true,
      data: {
        payment_id: 'pay_' + Date.now(),
        qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=BK-' + Date.now(),
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
    // Mock: sau 5 giây tự động chuyển thành paid
    const mockPaid = Date.now() > parseInt(paymentId.split('_')[1]) + 5000;
    return {
      success: true,
      status: mockPaid ? 'paid' : 'pending'
    };
  }
}

const paymentService = new PaymentService();
export default paymentService;