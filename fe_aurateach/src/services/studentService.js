import apiClient from './apiClient';

export const studentService = {
  // Lấy danh sách khóa học
  getStudents: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/students${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },
};