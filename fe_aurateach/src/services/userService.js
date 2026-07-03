import apiClient from "./apiClient";
import authService from "./authService";

const userService = {
  // Lấy chi tiết user từ server
  getUserDetails: async (userId) => {
    // Sửa thành apiClient.get
    return await apiClient.get(`/users/${userId}`);
  },

  getTutorDetails: async (userId) => {
    // Sửa thành apiClient.get
    return await apiClient.get(`/tutors?user_id=${userId}`);
  },

  // Cập nhật thông tin user
  updateProfile: async (userId, userData) => {
    // Sửa thành apiClient.patch
    // Không cần JSON.stringify vì apiClient đã làm giúp bạn
    const result = await apiClient.patch(`/users/${userId}`, userData);

    // Đồng bộ lại cookie để UI luôn tươi mới
    if (result.user) {
      authService.setAuthCookies(result.user);
    }
    return result;
  },
};

export default userService;