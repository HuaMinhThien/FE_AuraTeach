import apiClient from './apiClient';

export const reviewService = {
  // Lấy danh sách đánh giá (hỗ trợ lọc theo tutor_id hoặc course_id)
  getReviews: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/reviews${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },

  // 💡 HÀM MỚI: Gửi đánh giá mới (Yêu cầu gửi kèm token đăng nhập qua apiClient)
  createReview: async (reviewData) => {
    // reviewData bao gồm: { course_id, student_id, rating, comment }
    return await apiClient.post('/reviews', reviewData);
  },
};