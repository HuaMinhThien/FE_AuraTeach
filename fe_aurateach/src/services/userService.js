import apiClient from "./apiClient";
import authService from "./authService";

const userService = {
  // Lấy chi tiết user từ server
  getUserDetails: async (userId) => {
    // Gọi API qua apiClient (tự động đính kèm base URL)
    return await apiClient(`/users/${userId}`);
  },

  getTutorDetails: async (userId) => {
    return await apiClient(`/tutors?user_id=${userId}`)
  },

  // Cập nhật thông tin user
  updateProfile: async (userId, userData) => {
    const result = await apiClient(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(userData),
    });

    // Đồng bộ lại cookie để UI luôn tươi mới
    if (result.user) {
      authService.setAuthCookies(result.user);
    }
    return result;
  },
};

export default userService;