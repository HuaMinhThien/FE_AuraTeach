import apiClient from "./apiClient";

export const lessonConfirmationService = {

  // Lấy danh sách xác nhận bài học của gia sư
  getLessonConfirmations: async (tutorId) => {
    return await apiClient.get(`/lesson-confirmations?tutor_id=${tutorId}`);
  },

  // Cập nhật trạng thái xác nhận bài học
  updateLessonConfirmation: async (id, data) => {
    return await apiClient.patch(`/lesson-confirmations/${id}`, data);
  },
};