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

  // 🚀 CÁC HÀM CÓ TÍCH HỢP CONSOLE.LOG BẮT LỖI CHI TIẾT

  async getTutorEarningsData(userId) {
    try {      
      // apiClient.get không hỗ trợ options.params — build query string thủ công
      const response = await apiClient.get(`/tutors/earnings?user_id=${encodeURIComponent(userId)}`);
      return response;
    } catch (error) {
      console.error("🔴 Lỗi API getTutorEarningsData chi tiết:", error);
      throw error;
    }
  },

  addBankAccount: async (bankData) => {
    console.log("🟡 Đang gửi dữ liệu thêm tài khoản ngân hàng:", bankData);
    try {
      const response = await apiClient.post('/tutors/earnings-actions', {
        action: 'add_bank_account',
        ...bankData,
      });
      console.log("🟢 Phản hồi thành công thêm ngân hàng:", response);
      
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
    console.log("🟡 Đang gửi yêu cầu đặt ngân hàng mặc định lên server:", bankData);
    try {
      const response = await apiClient.post('/tutors/earnings-actions', {
        action: 'set_default_bank',
        ...bankData,
      });
      console.log("🟢 Phản hồi thành công đặt ngân hàng mặc định:", response);
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
    console.log("🟡 Đang gửi yêu cầu chỉnh sửa hồ sơ lên server:", payload);
    try {
      // Endpoint này trỏ tới route nhận yêu cầu cập nhật hồ sơ từ phía gia sư
      const response = await apiClient.post('/admin-tutor-update-requests', payload);
      console.log("🟢 Phản hồi thành công gửi yêu cầu cập nhật:", response);
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
      // apiClient.get already returns the parsed JSON body directly (no extra .data wrapping)
      // BE returns: { success, hasPending, data: <TutorUpdateReq|null> }
      return await apiClient.get(`/tutors/${tutorId}/pending-update-request`);
    } catch (error) {
      console.error("Lỗi kiểm tra pending update:", error);
      throw error;
    }
  },

  // Đảm bảo viết đúng thế này:
  toggleSuggestions: async (userId, receiveSuggestions) => {
        try {
            const response = await apiClient.patch('/tutor/toggle-suggestions', {
                userId: userId,
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