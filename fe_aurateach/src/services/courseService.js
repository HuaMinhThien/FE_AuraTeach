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

  // Lấy danh sách danh mục (Gọi vào API /categories mới)
  getCategories: async () => {
    return await apiClient.get('/categories');
  }
};