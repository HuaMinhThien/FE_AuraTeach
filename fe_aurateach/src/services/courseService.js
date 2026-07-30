import apiClient from './apiClient';
import axios from 'axios'; // Import axios gốc

export const courseService = {
  // Lấy danh sách khóa học
  getCourses: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `http://127.0.0.1:8000/api/courses${queryString ? `?${queryString}` : ''}`; // Đổi URL API chuẩn của laravel vào đây nếu cần
    
    // Dùng axios gốc gọi thẳng, đảm bảo không bị dính interceptor bóc bậy bạ
    const response = await axios.get(endpoint);
    return response.data; // Lúc này response.data chính là Object phân trang chuẩn của Laravel
  },

  // Lấy chi tiết 1 khóa học
  getCourseDetail: async (id) => {
    const response = await apiClient.get(`/courses/${id}`);
    return response.data !== undefined ? response.data : response;
  },

  // ➕ Thêm hàm tạo mới khóa học / lớp học
  createCourse: async (courseData) => {
    const response = await apiClient.post('/courses', courseData);
    return response.data !== undefined ? response.data : response;
  },

  // Cập nhật trạng thái khóa học/lớp học
  updateCourseStatus: async (id, statusData) => {
    const response = await apiClient.patch(`/courses/${id}`, statusData);
    return response.data !== undefined ? response.data : response;
  },

  checkScheduleConflict: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/courses/check-conflict${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response.data !== undefined ? response.data : response;
  },
};