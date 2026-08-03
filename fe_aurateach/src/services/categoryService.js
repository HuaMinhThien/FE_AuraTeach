import apiClient from './apiClient';

export const categoryService = {
  // Lấy danh sách danh mục
  getCategories: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/categories${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },
};