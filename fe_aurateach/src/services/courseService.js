import apiClient from './apiClient';
import axios from 'axios'; // Import axios gốc

export const courseService = {
  // Lấy danh sách khóa học
  getCourses: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `http://127.0.0.1:8000/api/courses${queryString ? `?${queryString}` : ''}`; 
    
    const response = await axios.get(endpoint);
    return response.data; 
  },

  // 🚀 Lấy chi tiết 1 khóa học (Trỏ tới endpoint /detail đã được tối ưu gom data ở Backend)
  getCourseDetail: async (id) => {
    const response = await apiClient.get(`/courses/${id}/detail`);
    return response.data !== undefined ? response.data : response;
  },

  // Thêm hàm tạo mới khóa học / lớp học
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