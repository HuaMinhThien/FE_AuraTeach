// src/services/authService.js
import apiClient from "./apiClient";

export const authService = {
  /**
   * Đăng ký tài khoản (Học viên hoặc Giảng viên)
   * @param {Object} userData - Dữ liệu đăng ký từ form
   */
  async register(userData) {
    try {
      // Gọi trực tiếp đến Next.js API Route hoặc Backend API
      const response = await apiClient.post("/auth/register", {
        full_name: userData.full_name || userData.fullName,
        email: userData.email,
        password: userData.password,
        phone: userData.phone || "",
        role: userData.role, // "student" hoặc "tutor"
        grade: userData.grade || "",
        schoolName: userData.schoolName || "",
        expertise: userData.expertise || "",
        cvLink: userData.cvLink || "",
      });

      return response;
    } catch (error) {
      throw new Error(error.message || "Đăng ký thất bại, vui lòng thử lại");
    }
  },

  /**
   * Tiện ích đăng ký nhanh cho Học viên
   */
  async registerStudent(studentData) {
    return this.register({
      ...studentData,
      role: "student",
    });
  },

  /**
   * Tiện ích đăng ký nhanh cho Giảng viên / Gia sư
   */
  async registerTeacher(teacherData) {
    return this.register({
      ...teacherData,
      role: "tutor",
    });
  },

  /**
   * Đăng nhập hệ thống
   */
  async login(credentials) {
    try {
      const response = await apiClient.post("/auth/login", credentials);
      if (response && response.access_token) {
        localStorage.setItem("access_token", response.access_token);
      }
      return response;
    } catch (error) {
      throw new Error(error.message || "Đăng nhập thất bại");
    }
  },

  /**
   * Đăng xuất hệ thống
   */
  async logout() {
    try {
      await apiClient.post("/api/auth/logout");
    } finally {
      localStorage.removeItem("access_token");
    }
  }
};