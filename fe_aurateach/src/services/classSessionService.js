import apiClient from "./apiClient"; // Đường dẫn trỏ tới file apiClient của bạn

export const classSessionService = {
  /**
   * Lấy danh sách tất cả các buổi học (có thể lọc theo course_id hoặc mảng course_ids)
   * @param {Object} params - Ví dụ: { course_id: 'crs-123' } hoặc { course_ids: ['crs-1', 'crs-2'] }
   */
  getSessions: async (params = {}) => {
    try {
      // Chuyển đổi mảng course_ids thành chuỗi phân cách bởi dấu phẩy nếu cần
      const queryParams = { ...params };
      if (Array.isArray(queryParams.course_ids)) {
        queryParams.course_ids = queryParams.course_ids.join(",");
      }

      // Tạo query string tự động
      const queryString = new URLSearchParams(queryParams).toString();
      const endpoint = `/class-sessions${queryString ? `?${queryString}` : ""}`;

      return await apiClient.get(endpoint);
    } catch (error) {
      console.error("❌ Lỗi khi lấy danh sách class sessions:", error);
      throw error;
    }
  },

  /**
   * Lấy chi tiết một buổi học theo ID (bao gồm course và danh sách điểm danh)
   * @param {string|number} id - session_id hoặc id của buổi học
   */
  getSessionById: async (id) => {
    try {
      return await apiClient.get(`/class-sessions/${id}`);
    } catch (error) {
      console.error(`❌ Lỗi khi lấy chi tiết session ID ${id}:`, error);
      throw error;
    }
  },
};