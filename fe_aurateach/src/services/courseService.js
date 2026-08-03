import apiClient from './apiClient';

export const courseService = {
  // Lấy danh sách khóa học
  getCourses: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/courses${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get(endpoint);
  },

  // 🚀 Lấy danh sách lớp học dành riêng cho trang quản lý của gia sư (Hiển thị tất cả trạng thái)
  getTutorManagedCourses: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/tutor/courses-manage${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(endpoint);
    return response.data !== undefined ? response.data : response;
  },

  // 🚀 Lấy chi tiết 1 khóa học (Trỏ tới endpoint /detail đã được tối ưu gom data ở Backend)
  getCourseDetail: async (id) => {
    const response = await apiClient.get(`/courses/${id}/detail`);
    return response.data !== undefined ? response.data : response;
  },

  // Thêm hàm tạo mới khóa học / lớp học
  createCourse: async (courseData) => {
    const response = await apiClient.post('/courses', courseData);
    return response.data !== undefined ? response.data : response;
  },

  // Cập nhật trạng thái khóa học/lớp học
  updateCourseStatus: async (id, statusData) => {
    const response = await apiClient.patch(`/courses/${id}`, statusData);
    return response.data !== undefined ? response.data : response;
  },

  checkScheduleConflict: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/courses/check-conflict${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response.data !== undefined ? response.data : response;
  },

  getSubscribedCourses: async (studentId) => {
    try {
      console.log("🚀 [API REQUEST] Đang gọi getSubscribedCourses với studentId:", studentId);
      console.log("🌐 [API URL]:", `/students/${studentId}/subscribed-courses`);

      const response = await apiClient.get(`/students/${studentId}/subscribed-courses`);
      
      console.log("📦 [API RESPONSE DATA]:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ [API ERROR tại getSubscribedCourses]:", error.response || error);
      throw error;
    }
  },
};