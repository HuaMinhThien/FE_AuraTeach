import apiClient from './apiClient';

export const userService = {
  getUsers: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },

  // --- BỔ SUNG: Khóa hoặc mở khóa tài khoản người dùng ---
  updateAccountStatus: async (userId, status) => {
    // status mong đợi: 'active' hoặc 'banned'
    try {
      const response = await apiClient.patch(`/admin/users/${userId}/status`, { status });
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái tài khoản:", error);
      throw error;
    }
  },
};