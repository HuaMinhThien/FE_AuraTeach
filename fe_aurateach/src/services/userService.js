import apiClient from './apiClient';

export const userService = {
  // Lấy danh sách khóa học
  getUsers: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },
};