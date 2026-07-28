import apiClient from './apiClient'; // Đường dẫn đến file apiClient của bạn

export const categoryService = {
  // Lấy danh sách danh mục
  getCategories: async () => {
    return await apiClient.get('/categories');
  },
};