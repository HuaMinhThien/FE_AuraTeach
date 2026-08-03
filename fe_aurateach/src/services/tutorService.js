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
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("Lỗi khi lấy thông tin tutor:", error);
      throw error;
    }
  },

  getFeaturedTutors: async () => {
    const response = await apiClient.get('/featured-tutors');
    return response.data !== undefined ? response.data : response;
  },

  // 💡 MỚI: Gọi API lấy danh sách gia sư liên quan từ Backend
  getRelatedTutors: async (id) => {
    try {
      const response = await apiClient.get(`/tutors/${id}/related`);
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error(`Lỗi khi lấy gia sư liên quan ID ${id}:`, error);
      return [];
    }
  },

  getDetail: async (id) => {
    try {
      const response = await apiClient.get(`/tutors/${id}`);
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error(`Lỗi khi lấy chi tiết gia sư ID ${id}:`, error);
      throw error;
    }
  },
};