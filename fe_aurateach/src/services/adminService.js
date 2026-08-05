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
};