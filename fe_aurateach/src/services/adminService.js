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

  getPendingUpdateRequests: async () => {
    const response = await apiClient.get('/admin-tutor-update-requests/all-pending'); // Hoặc endpoint tùy bạn thiết kế ở Laravel
    return response.data !== undefined ? response.data : response;
  },

  respondUpdateEvaluationRequest: async (reqId, data) => {
    try {
      const response = await apiClient.post(`/admin/tutor-update-requests/${reqId}/handle`, data);
      // Phải đảm bảo trả về response.data để lấy được object { success: true, message: ... }
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("Lỗi khi xử lý yêu cầu:", error);
      throw error;
    }
  },

  getClassesManagementData: async () => {
    const response = await apiClient.get('/admin/classes-management');
    return response.data !== undefined ? response.data : response;
  },

  approveTutor: async (userId, tutorId, teachingLevels, level) => {
    if (!userId || !tutorId) {
      throw new Error("Thiếu thông tin userId hoặc tutorId");
    }
    
    // Gửi kèm teaching_levels và level lên backend
    const response = await apiClient.post('/admin/tutors/approve', { 
      userId, 
      tutorId,
      teaching_levels: teachingLevels,
      level: level
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

  getReports: async (params = {}) => {
    // params có thể là { status: 'pending', tutor_id: '...' }
    return await apiClient.get("/admin-tutor-reports", { params });
  },

  // Gửi báo cáo mới
  createReport: async (reportData) => {
    // reportData cần gửi đủ các trường: tutor_id, student_id, course_id, reason, ...
    return await apiClient.post("/admin-tutor-reports", reportData);
  },  

  updateReport: async (report_id, updateData) => {
    // updateData gồm: { status: '...', admin_note: '...' }
    return await apiClient.put(`/admin-tutor-reports/${report_id}`, updateData);
  },

  // DELETE: Xóa báo cáo
  deleteReport: async (report_id) => {
    return await apiClient.delete(`/admin-tutor-reports/${report_id}`);
  },

  getInitialReportData: async (tutorId, studentId) => {
    try {
      console.log("🚀 Đang truyền tutorId lên:", tutorId);

      // CÁCH AN TOÀN NHẤT: Nối thẳng chuỗi vào URL để chắc chắn request có chứa param
      const url = `/admin-tutor-reports/initial-data?tutorId=${tutorId}&studentId=${studentId}`;

      const response = await apiClient.get(url);

      return response.data !== undefined ? response.data : response;
    } catch (error) {
      throw error;
    }
  },
};