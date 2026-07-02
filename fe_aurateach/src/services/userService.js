// src/services/userService.js
import apiClient from "./apiClient";
import authService from "./authService";

const userService = {
  // Lấy thông tin user (thay thế GET /api/users/[id])
  getUserById: async (userId) => {
    return await apiClient(`/users/${userId}`);
  },

  // Cập nhật thông tin (thay thế PATCH /api/users/[id])
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