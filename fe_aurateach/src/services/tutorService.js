import apiClient from './apiClient';

export const tutorService = {
  getTutors: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/tutors${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },
  
  getByUserId: async (userId) => {
    try {
      const response = await apiClient.get(`/tutors/user/${userId}`);
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

  updateTutorBalance: async (tutorDbId, data) => {
    return await apiClient.patch(`/tutors/${tutorDbId}`, data);
  },


  async getTutorEarningsData(userId) {
    try {      
      // 🚀 Sửa lại cách truyền tham số cho apiClient để Laravel chắc chắn nhận được user_id
      const response = await apiClient.get("/tutors/earnings", {
        params: { user_id: userId } 
      });
      
      return response;
    } catch (error) {
      console.error("🔴 Lỗi API getTutorEarningsData chi tiết:", error);
      throw error;
    }
  },

  addBankAccount: async (bankData) => {
    try {
      const response = await apiClient.post('/tutors/earnings-actions', {
        action: 'add_bank_account',
        ...bankData,
      });
      
      // 🚀 Sửa lại chỗ này: Trả về thẳng response.data để giữ lại các trường { success, message, data }
      return response.data; 
    } catch (error) {
      console.error("🔴 Lỗi API addBankAccount chi tiết:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  setDefaultBank: async (bankData) => {
    try {
      const response = await apiClient.post('/tutors/earnings-actions', {
        action: 'set_default_bank',
        ...bankData,
      });
      return response; 
    } catch (error) {
      console.error("🔴 Lỗi API setDefaultBank chi tiết:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  sendUpdateEvaluationRequest: async (payload) => {
    try {
      // Endpoint này trỏ tới route nhận yêu cầu cập nhật hồ sơ từ phía gia sư
      const response = await apiClient.post('/admin-tutor-update-requests', payload);
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("🔴 Lỗi API sendUpdateEvaluationRequest chi tiết:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  checkPendingUpdate: async (tutorId) => {
    try {
      const response = await apiClient.get(`/tutors/${tutorId}/pending-update-request`);
      if (!response) return null;
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("Lỗi kiểm tra pending update:", error);
      return null;
    }
  },

  // Đảm bảo viết đúng thế này:
  toggleSuggestions: async (userId, receiveSuggestions) => {
        try {
            const response = await apiClient.patch('/tutor/toggle-suggestions', {
                userId: userId,
                accept_suggested_classes: receiveSuggestions,
                receive_suggestions: receiveSuggestions
            });
            
            // 🚀 Vì apiClient đã tự động bóc data, ta trả về thẳng response luôn:
            return response; 
        } catch (error) {
            console.error("Lỗi service toggleSuggestions:", error);
            throw error;
        }
    }
};
