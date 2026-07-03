import apiClient from "./apiClient";

const courseSubscriptionService = {
  // Lấy lịch sử đăng ký của học sinh
  getStudentHistory: async (studentId) => {
      // Thay vì truyền ID trực tiếp vào URL (dạng show), 
      // hãy truyền dưới dạng query parameter (dạng lọc/lấy danh sách)
      return await apiClient.get(`/course-subscriptions?student_id=${studentId}`);
  },

  // Tạo mới đăng ký
  createSubscription: async (data) => {
    return await apiClient.post(`/course-subscriptions`, {
      course_id: data.courseId,
      student_id: data.studentId,
      tutor_id: data.tutorId,
      notes: data.notes,
      payment_method: data.paymentMethod
    });
  },

  // Lấy chi tiết đăng ký
  getById: async (id) => {
    return await apiClient.get(`/course-subscriptions/${id}`);
  },

  // Cập nhật đăng ký
  updateSubscription: async (id, updateData) => {
    return await apiClient.patch(`/course-subscriptions/${id}`, updateData);
  },

  // Hủy/Xóa đăng ký
  deleteSubscription: async (id) => {
    return await apiClient.delete(`/course-subscriptions/${id}`);
  },

  async registerCourse(data) {
    // Gửi thẳng vào endpoint mới đã tạo
    return await apiClient.post("/course-registration", data);
  }
};

export default courseSubscriptionService;