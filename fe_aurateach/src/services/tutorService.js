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
      console.log("🟡 Đang gọi API getTutorEarningsData với user_id:", userId);
      
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

  createPayoutRequest: async (payoutData) => {
    console.log("🟡 Đang gửi yêu cầu rút tiền lên server:", payoutData);
    try {
      const response = await apiClient.post('/tutors/earnings-actions', {
        action: 'create_payout_request',
        ...payoutData,
      });
      console.log("🟢 Phản hồi thành công tạo yêu cầu rút tiền:", response);
      
      // 🚀 Trả thẳng response vì apiClient đã tự lo việc bóc tách data (hoặc trả về nguyên cục)
      return response; 
    } catch (error) {
      console.error("🔴 Lỗi API createPayoutRequest chi tiết:", {
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
      const response = await apiClient.get(`/tutors/${tutorId}/pending-update-request`);
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("Lỗi kiểm tra pending update:", error);
      throw error;
    }
  },
};