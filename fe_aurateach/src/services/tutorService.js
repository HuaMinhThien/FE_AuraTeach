import apiClient from "./apiClient";

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

const tutorService = {
  getProfileByUserId: async (currentUserId) => {
    const [users, tutors] = await Promise.all([
      apiClient.get("/users"),
      apiClient.get("/tutors"),
    ]);

    const userObj = Array.isArray(users) ? users.find((u) => u.user_id === currentUserId || u.id === currentUserId) : null;
    const tutorObj = Array.isArray(tutors) ? tutors.find((t) => t.user_id === currentUserId) : null;

    if (!userObj || !tutorObj) {
      throw new Error("Không tìm thấy dữ liệu gia sư.");
    }

    return { ...userObj, ...tutorObj };
  },

  getTutorDetails: async (userId) => {
    return await apiClient.get(`/tutors?user_id=${userId}`);
  },

  updateTutorProfile: async (userId, tutorData) => {
    return await apiClient.patch(`/tutors/${userId}`, tutorData);
  },
};

export default tutorService;