import apiClient from './apiClient';

export const classRequestService = {
  // Lấy danh sách yêu cầu lớp học (có hỗ trợ truyền params như tutor_id)
  getClassRequests: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/class-requests${queryString ? `?${queryString}` : ''}`;
    
    console.log(`🚀 [API SERVICE] Đang gọi GET ${endpoint}`);
    try {
      const response = await apiClient.get(endpoint);
      console.log(`📦 [API SERVICE] Phản hồi danh sách class-requests gốc:`, response);
      return response;
    } catch (error) {
      console.error(`❌ [API SERVICE ERROR] Lỗi khi gọi GET ${endpoint}:`, error.response || error);
      throw error;
    }
  },

  // Lấy chi tiết một yêu cầu lớp học theo ID
  getClassRequestDetail: async (id) => {
    const response = await apiClient.get(`/class-requests/${id}`);
    return response.data !== undefined ? response.data : response;
  },

  // Tạo mới một yêu cầu lớp học (Từ phía học sinh)
  createClassRequest: async (requestData) => {
    const response = await apiClient.post('/class-requests', requestData);
    return response.data !== undefined ? response.data : response;
  },

  // Gia sư bấm "Nhận dạy" (Ứng tuyển vào lớp yêu cầu)
  applyClassRequest: async (applyData) => {
    // Không cần truyền action: 'apply' nữa vì đã có route riêng
    const response = await apiClient.post('/apply-request', applyData);
    return response.data;
  },

  // Cập nhật trạng thái hoặc thông tin yêu cầu lớp học
  updateClassRequestStatus: async (id, statusData) => {
    console.log(`🌐 [API SERVICE] Đang gọi PATCH /class-requests/${id} với payload:`, statusData);
    try {
      const response = await apiClient.patch(`/class-requests/${id}`, statusData);
      console.log(`📦 [API SERVICE] Phản hồi thành công từ PATCH /class-requests/${id}:`, response);
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error(`❌ [API SERVICE ERROR] Lỗi khi gọi PATCH /class-requests/${id}:`, error.response || error);
      throw error;
    }
  },

  // Lấy danh sách các đơn ứng tuyển của một lớp hoặc gia sư (nếu cần quản lý riêng)
  getRequestApplications: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/request-applications${queryString ? `?${queryString}` : ''}`;
    
    try {
      console.log("🚀 [API REQUEST] Đang gọi getRequestApplications với params:", params);
      const response = await apiClient.get(endpoint);
      console.log("📦 [API RESPONSE DATA]:", response);
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("❌ [API ERROR tại getRequestApplications]:", error.response || error);
      throw error;
    }
  },

  updateApplicationStatus: async (applicationId, statusData) => {
    console.log(`🌐 [API SERVICE] Đang gọi PATCH /request-applications/${applicationId} với payload:`, statusData);
    try {
      const response = await apiClient.patch(`/request-applications/${applicationId}`, statusData);
      console.log(`📦 [API SERVICE] Phản hồi thành công từ PATCH /request-applications/${applicationId}:`, response);
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error(`❌ [API SERVICE ERROR] Lỗi khi gọi PATCH /request-applications/${applicationId}:`, error.response || error);
      throw error;
    }
  },

  deleteClassRequest: async (id) => {
    const response = await apiClient.delete(`/class-requests/${id}`);
    return response.data !== undefined ? response.data : response;
  },

  getAdminSuggestions: async (tutorId) => {
    const response = await apiClient.get(`/admin/suggestions?tutorId=${tutorId}`);
    return response.data !== undefined ? response.data : response;
  },

  // Nhận lớp đề xuất từ Admin
  acceptAdminSuggestion: async (courseId, tutorId) => {
    const response = await apiClient.post('/admin/classes/accept', { courseId, tutorId });
    return response.data !== undefined ? response.data : response;
  },
};