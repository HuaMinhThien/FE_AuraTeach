// src/services/adminService.js
import apiClient from './apiClient';

export const adminService = {
  // Lấy toàn bộ danh sách tài khoản (đã kết hợp User + Student/Tutor từ Laravel)
  getAllAccounts: async () => {
    try {
      const response = await apiClient.get('/admin/accounts'); // Đảm bảo route này tồn tại ở Laravel BE
      return response;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách tài khoản:", error);
      throw error;
    }
  },

  updateStudentStatus: async (userId, status) => {
    try {
      const response = await apiClient.patch(`/admin/students/${userId}/status`, { status });
      return response;
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái học viên:", error);
      throw error;
    }
  },

  updateTutorStatus: async (payload) => {
    try {
      const response = await apiClient.patch('/admin/tutors/status', payload);
      return response;
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái gia sư:", error);
      throw error;
    }
  }
};