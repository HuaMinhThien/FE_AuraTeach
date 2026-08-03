import apiClient from './apiClient';

export const courseScheduleService = {
  getCourseSchedules: async () => {
    const response = await apiClient.get('/courseSchedules');
    return response.data !== undefined ? response.data : response;
  },

  getStudentScheduleSessions: async (userId) => {
    try {
      const response = await apiClient.get(`/students/${userId}/schedule-sessions`);
      return response.data;
    } catch (error) {
      console.error("Lỗi gọi API lấy lịch học:", error);
      throw error;
    }
  }
};