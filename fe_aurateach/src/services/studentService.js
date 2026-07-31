import apiClient from './apiClient';

export const studentService = {
  getStudents: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/students${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },

  async updateProfile(userId, updateData) {
    try {
      // Kiểm tra nếu apiClient hỗ trợ hàm request chung (ví dụ apiClient.request hoặc gọi trực tiếp)
      const response = await apiClient.put(`/users/${userId}`, updateData);
      return response;
    } catch (error) {
      throw new Error(error.message || "Cập nhật thông tin thất bại");
    }
  }
};