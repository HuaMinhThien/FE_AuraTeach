import apiClient from './apiClient';

export const courseService = {
  // Lấy danh sách khóa học
  getCourses: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/courses${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },

  // Lấy chi tiết 1 khóa học
  getCourseDetail: async (id) => {
    return await apiClient.get(`/courses/${id}`);
  },

  // 👈 Bổ sung hàm cập nhật trạng thái lớp học/khóa học (Dùng cho tính năng khóa lớp)
  updateCourseStatus: async (id, statusData) => {
    return await apiClient.patch(`/courses/${id}`, statusData);
  },
};