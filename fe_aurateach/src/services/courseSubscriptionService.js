// src/services/courseSubscriptionService.js
import apiClient from "./apiClient";

export const courseSubscriptionService = {
  // Hàm tạo booking / đăng ký khóa học
  createBooking: async (subscriptionData) => {
    // apiClient.post tự động nối với http://localhost:8000/api và xử lý header, token
    return await apiClient.post("/course-subscriptions", subscriptionData);
  },
};