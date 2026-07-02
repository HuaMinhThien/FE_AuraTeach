import apiClient from "./apiClient";

const courseService = {
  // 1. Lấy danh sách khóa học (tương ứng với hàm GET cũ)
  // Lưu ý: Bạn nên truyền tutorId từ Component gọi nó
  getAllCourses: async (tutorId, params = {}) => {
    const { page = 1, limit = 6, status = "all", search = "" } = params;
    const query = new URLSearchParams({ tutor_id: tutorId, page, limit, status, search });
    
    return await apiClient(`/courses?${query.toString()}`);
  },

  // 2. Tạo khóa học mới (tương ứng với hàm POST cũ)
  createCourse: async (courseData) => {
    return await apiClient("/courses", {
      method: "POST",
      body: JSON.stringify(courseData),
    });
  },

  // 3. Cập nhật trạng thái khóa học
  updateStatus: async (courseId, status) => {
    return await apiClient(`/courses/${courseId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  
  // Kiểm tra trùng lịch
  checkConflict: async (params) => {
    return await apiClient(`/courses/check-conflict?${params.toString()}`);
  },

  getCategories: async () => {
    return await apiClient("/categories");
  },
};

export default courseService;