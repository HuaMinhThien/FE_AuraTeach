import apiClient from './apiClient';

export const reviewService = {
  // Lấy danh sách đánh giá (hỗ trợ lọc theo tutor_id hoặc course_id)
  getReviews: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/reviews${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },

  // Kiểm tra học sinh đã đánh giá lớp này chưa
  // Trả về { reviewed: true/false }
  checkReviewed: async (studentId, courseId) => {
    const params = new URLSearchParams({ student_id: studentId, course_id: courseId }).toString();
    return await apiClient.get(`/reviews/check?${params}`);
  },

  // Gửi đánh giá mới
  createReview: async (reviewData) => {
    return await apiClient.post('/reviews', reviewData);
  },
};