import apiClient from './apiClient';

export const courseService = {
  // Lấy danh sách khóa học
  getCourses: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/courses${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get(endpoint);
  },

  // Lấy tất cả lớp học của gia sư để hiển thị lịch trình (không phân trang, bỏ completed)
  getTutorScheduleCourses: async (tutorId) => {
    const response = await apiClient.get(`/tutor/schedule-courses?tutor_id=${tutorId}`);
    const data = response.data !== undefined ? response.data : response;
    return Array.isArray(data) ? data : (data.data || []);
  },

  getCourseDashboard: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/tutor/courses-dashboard${queryString ? `?${queryString}` : ''}`;
    
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
      const response = await apiClient.get(`/students/${studentId}/subscribed-courses`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTimesheetData: async (month, year) => {
    try {
      const response = await apiClient.get('/tutor/timesheet-data', {
        params: { month, year }
      });

      // Trả về object chứa { courses, sessions } dù response có bị bóc tách qua Axios hay chưa
      const data = response.data || response;
      return {
        courses: Array.isArray(data.courses) ? data.courses : [],
        sessions: Array.isArray(data.sessions) ? data.sessions : []
      };
    } catch (error) {
      console.error("❌ Lỗi lấy dữ liệu timesheet gộp:", error);
      return { courses: [], sessions: [] };
    }
  },
};