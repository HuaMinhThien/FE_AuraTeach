import apiClient from './apiClient';

export const tutorService = {
  getTutors: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/tutors${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },
  getByUserId: async (userId) => {
    try {
      const response = await apiClient.get(`/tutors`, {
        params: { user_id: userId }
      });
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy thông tin tutor:", error);
      throw error;
    }
  },
};