import apiClient from "./apiClient";

const courseService = {
  // 1. Lấy danh sách khóa học
  getAll: async (tutorId, params = {}) => {
    const { page = 1, limit = 6, status = "all", search = "" } = params;
    const query = new URLSearchParams({ tutor_id: tutorId || '', page, limit, status, search });
    return await apiClient.get(`/courses?${query.toString()}`);
  },

  // 2. Tạo khóa học mới
  createCourse: async (courseData) => {
    // Đổi thành .post()
    return await apiClient.post("/courses", courseData);
  },

  // 3. Cập nhật trạng thái khóa học
  updateStatus: async (courseId, status) => {
    // Đổi thành .patch()
    return await apiClient.patch(`/courses/${courseId}`, { status });
  },
  
  // Kiểm tra trùng lịch
  checkConflict: async (params) => {
    // Đổi thành .get()
    return await apiClient.get(`/courses/check-conflict?${params.toString()}`);
  },

  getCategories: async () => {
    // Đổi thành .get()
    return await apiClient.get("/categories");
  },

  getUsers: async () => {
    return await apiClient.get("/users"); // Đảm bảo bạn có UserController ở Backend
  },

  getTutors: async () => {
    return await apiClient.get("/tutors"); // Đảm bảo bạn có TutorsController ở Backend
  },
  
  getDashboardData: async () => {
    return await apiClient.get("/courses-list-data"); 
  },

  getDetailedCourse: async (courseId) => {
    return await apiClient.get(`/courses/${courseId}`);
  },

  async bookCourse(bookingData) {
    // Giả sử bạn có apiClient dùng axios hoặc fetch được cấu hình sẵn
    return await apiClient.post("/course", bookingData);
    }
};

export default courseService;