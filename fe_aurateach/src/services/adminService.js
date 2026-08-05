import apiClient from './apiClient';

export const adminService = {
  // --- BỔ SUNG: Lấy danh sách tất cả tài khoản ---
  getAllAccounts: async () => {
    const response = await apiClient.get('/admin/accounts');
    return response.data !== undefined ? response.data : response;
  },

  // --- BỔ SUNG: Cập nhật trạng thái của học viên ---
  updateStudentStatus: async (userId, status) => {
    const response = await apiClient.patch(`/admin/students/${userId}/status`, { status });
    return response.data !== undefined ? response.data : response;
  },

  // --- BỔ SUNG: Cập nhật trạng thái hoặc duyệt hồ sơ của gia sư ---
  updateTutorStatus: async (payload) => {
    // payload có thể truyền lên { userId, status } hoặc { tutorId, verificationStatus } tùy ngữ cảnh
    const response = await apiClient.patch('/admin/tutors/status', payload);
    return response.data !== undefined ? response.data : response;
  },

  // --- Các hàm thống kê cũ ---
  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data !== undefined ? response.data : response;
  },

  getRegistrationStats: async (period = 'week') => {
    const response = await apiClient.get('/admin/stats/registrations', { params: { period } });
    return response.data !== undefined ? response.data : response;
  },

  getRevenueStats: async (period = 'week') => {
    const response = await apiClient.get('/admin/stats/revenue', { params: { period } });
    return response.data !== undefined ? response.data : response;
  },

  getUpdateRequests: async (params = {}) => {
    const queryParams = typeof params === 'object' ? params : { tutor_id: params };
    const queryString = new URLSearchParams(queryParams).toString();
    const endpoint = `/admin-tutor-update-requests${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response.data !== undefined ? response.data : response;
  },

  sendUpdateEvaluationRequest: async (data) => {
    try {
      const response = await apiClient.post('/admin-tutor-update-requests', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getClassesManagementData: async () => {
    const response = await apiClient.get('/admin/classes-management');
    return response.data !== undefined ? response.data : response;
  },

  approveTutor: async (userId, tutorId) => {
    if (!userId || !tutorId) {
      throw new Error("Thiếu thông tin userId hoặc tutorId");
    }
    // Gọi trực tiếp đến endpoint Laravel xử lý việc duyệt gia sư
    // Hoặc bạn có thể dùng chung hàm updateTutorStatus nếu backend thiết kế gộp chung
    const response = await apiClient.post('/admin/tutors/approve', { 
      userId, 
      tutorId 
    });
    return response;
  },

  deleteRejectedTutor: async (userId, tutorId) => {
    if (!userId || !tutorId) {
      throw new Error("Thiếu thông tin userId hoặc tutorId");
    }
    // Sử dụng phương thức DELETE với body bằng cách truyền vào options.body thông qua apiClient
    // Hoặc điều chỉnh apiClient nếu bạn hỗ trợ truyền data trong DELETE. 
    // Dưới đây dùng cách cấu hình chuẩn thông qua endpoint hoặc body tùy chỉnh.
    const response = await apiClient.delete('/admin/tutors/delete-rejected', {
      headers: {
        'Content-Type': 'application/json'
      },
      // Lưu ý: Nếu apiClient của bạn chưa hỗ trợ gửi body trong DELETE, 
      // bạn có thể đổi thành apiClient.post hoặc truyền qua params/body tùy thiết kế Laravel.
    });
    return response;
  },

  getPendingTutors: async () => {
    const response = await apiClient.get('/admin/tutors/pending');
    return response.data !== undefined ? response.data : response;
  },

  rejectTutor: async (userId, tutorId, reason) => {
    if (!userId || !tutorId) {
      throw new Error("Thiếu thông tin userId hoặc tutorId");
    }
    if (!reason || !reason.trim()) {
      throw new Error("Vui lòng nhập lý do từ chối");
    }

    const response = await apiClient.post('/admin/tutors/reject', {
      userId,
      tutorId,
      reason: reason.trim()
    });
    return response;
  },

  getPayoutRequests: async () => {
    return await apiClient.get('/admin-tutor-payout-requests');
  },

  // --- Cập nhật trạng thái yêu cầu rút tiền (Duyệt / Từ chối kèm lý do) ---
  updatePayoutRequestStatus: async (payload) => {
    return await apiClient.patch('/admin-tutor-payout-requests', payload);
  },
};