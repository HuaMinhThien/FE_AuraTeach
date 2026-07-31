// src/services/courseSubscriptionService.js
import apiClient from "./apiClient";

export const courseSubscriptionService = {
  getSubscriptions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/course-subscriptions${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },

  // Hàm tạo booking / đăng ký khóa học
  createBooking: async (subscriptionData) => {
    // apiClient.post tự động nối với http://localhost:8000/api và xử lý header, token
    return await apiClient.post("/course-subscriptions", subscriptionData);
  },
};