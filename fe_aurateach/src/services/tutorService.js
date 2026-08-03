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
      // 💡 Nếu response đã là data thì trả về luôn, nếu có .data thì lấy .data
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("Lỗi khi lấy thông tin tutor:", error);
      throw error;
    }
  },

  getFeaturedTutors: async () => {
    const response = await apiClient.get('/featured-tutors');
    return response.data;
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