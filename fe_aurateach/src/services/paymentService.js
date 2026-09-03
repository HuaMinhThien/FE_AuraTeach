import apiClient from "./apiClient";

const paymentService = {
  // 1. Tạo mã QR thanh toán
  createQR: async (subscriptionId, studentId, amount) => {
    return await apiClient.post("/payments/create-qr", {
      subscription_id: subscriptionId,
      student_id: studentId,
      amount: amount
    });
  },

  // 2. Kiểm tra trạng thái thanh toán (Dùng cho Polling)
  checkStatus: async (paymentId) => {
    return await apiClient.get(`/payments/status/${paymentId}`);
  },

  // 3. Mô phỏng thanh toán thành công (dùng khi test)
  manualPay: async (paymentId) => {
    return await apiClient.post(`/payments/manual-pay/${paymentId}`);
  },

  // 4. Hủy booking nếu đóng modal mà chưa thanh toán
  cancelBooking: async (subscriptionId) => {
    return await apiClient.delete(`/course-subscriptions/${subscriptionId}`);
  },

  // 🔹 5. Bổ sung hàm hủy giao dịch thanh toán theo paymentId
  cancelPayment: async (paymentId) => {
    return await apiClient.post(`/payments/cancel/${paymentId}`);
  }
};

export default paymentService;