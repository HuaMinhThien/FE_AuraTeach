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
    return await apiClient.post("/course-subscriptions", subscriptionData);
  },

  updateSubscriptionCourse: async (subscriptionId, data) => {
    try {
      // apiClient đã tự động nối với API_BASE_URL (http://localhost:8000/api)
      // và tự động đính kèm token xác thực, xử lý JSON.stringify
      const response = await apiClient.put(`/course-subscriptions/${subscriptionId}/course`, data);
      return response;
    } catch (error) {
      console.error("Lỗi khi cập nhật course_id cho subscription:", error);
      throw error;
    }
  }
};