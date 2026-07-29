import apiClient from './apiClient';

export const reviewService = {
  // Lấy danh sách khóa học
  getReviews: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/reviews${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },
};