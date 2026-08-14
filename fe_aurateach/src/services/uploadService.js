import apiClient from "./apiClient";

export const uploadService = {
  /**
   * Tải file lên hệ thống (Chat, Avatar, Thumbnail khóa học,...)
   * @param {File} file - File từ thẻ input
   * @param {string} folder - Tên thư mục phân loại ('chat', 'avatars', 'courses')
   */
  uploadFile: async (file, folder = "general") => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      // apiClient tự động nhận diện FormData và bỏ Content-Type
      const response = await apiClient.post("/upload", formData);
      return response;
    } catch (error) {
      console.error("❌ Lỗi khi tải file lên Cloudinary:", error);
      throw error;
    }
  },
};