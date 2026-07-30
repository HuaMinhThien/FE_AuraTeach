import apiClient from './apiClient';

export const categoryService = {
  // Lấy danh sách danh mục
  getCourseSchedules: async () => {
    const response = await apiClient.get('/courseSchedules');
    return response.data !== undefined ? response.data : response;
  },
};