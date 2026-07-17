import apiClient from "./apiClient";
import authService from "./authService";

export const COURSE_COLORS = [
  { bg: "#e0f2fe", text: "#0369a1", border: "#0ea5e9" },
  { bg: "#fef3c7", text: "#b45309", border: "#f59e0b" },
  { bg: "#dcfce7", text: "#15803d", border: "#22c55e" },
  { bg: "#f3e8ff", text: "#6b21a8", border: "#a855f7" },
  { bg: "#ffe4e6", text: "#b91c1c", border: "#f43f5e" },
  { bg: "#ffedd5", text: "#c2410c", border: "#f97316" },
  { bg: "#e2e8f0", text: "#334155", border: "#64748b" },
];

export const getColorForCourse = (courseId) => {
  if (!courseId) return COURSE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_COLORS.length;
  return COURSE_COLORS[index];
};

export const COURSE_LABELS = ["THU 2", "THU 3", "THU 4", "THU 5", "THU 6", "THU 7", "CHỦ NHẬT"];

export const MAP_SCHEDULE_DAY_INDEX = {
  "Thứ 2": 0, "Thứ 3": 1, "Thứ 4": 2, "Thứ 5": 3, "Thứ 6": 4, "Thứ 7": 5, "Chủ Nhật": 6
};

const courseService = {
  // 1. Lấy danh sách khóa học
  getAll: async (tutorId, params = {}) => {
    const { page = 1, limit = 6, status = "all", search = "" } = params;
    const query = new URLSearchParams({ tutor_id: tutorId || '', page, limit, status, search });
    return await apiClient.get(`/courses?${query.toString()}`);
  },

  // 2. Tạo khóa học mới
  createCourse: async (courseData) => {
    return await apiClient.post("/courses", courseData);
  },

  // 3. Cập nhật trạng thái khóa học
  updateStatus: async (courseId, status) => {
    return await apiClient.patch(`/courses/${courseId}`, { status });
  },
  
  // Kiểm tra trùng lịch
  checkConflict: async (params) => {
    return await apiClient.get(`/courses/check-conflict?${params.toString()}`);
  },

  getCategories: async () => {
    return await apiClient.get("/categories");
  },

  getUsers: async () => {
    return await apiClient.get("/users");
  },

  getTutors: async () => {
    return await apiClient.get("/tutors");
  },
  
  getDashboardData: async () => {
    return await apiClient.get("/courses-list-data"); 
  },

  getDetailedCourse: async (courseId) => {
    return await apiClient.get(`/courses/${courseId}`);
  },

  async bookCourse(bookingData) {
    return await apiClient.post("/course", bookingData);
  },

  // 💡 Gom thêm các hàm liên quan đến course được chuyển dời vào đây để đồng bộ
  getActiveCourses: async (tutorId) => {
    // Nếu bên ngoài không truyền tutorId vào, tự động gọi authService để lấy
    let idToUse = tutorId;
    if (!idToUse) {
      const user = await authService.getCurrentUser();
      idToUse = user?.id || user?.user_id;
    }

    const query = idToUse ? `?tutor_id=${idToUse}&status=active` : `?status=active`;
    return await apiClient.get(`/courses${query}`);
  }
};

export default courseService;