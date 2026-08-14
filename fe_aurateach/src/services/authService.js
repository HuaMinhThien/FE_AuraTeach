// src/services/authService.js
import apiClient from "./apiClient";

export const authService = {
  /**
   * Đăng ký tài khoản (Học viên hoặc Giảng viên)
   * @param {Object} userData - Dữ liệu đăng ký từ form
   */
  async register(userData) {
    try {
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
      await apiClient.post("/auth/logout");
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("user_token");
    }
  },

  /**
   * Lấy thông tin user hiện tại
   */
  async getCurrentUser() {
    try {
      const response = await apiClient.get("/auth/me");
      const resData = response.data !== undefined ? response.data : response;
      
      if (resData && resData.user) {
        return resData.user;
      }
      
      return resData;
    } catch (error) {
      console.error("Lỗi lấy thông tin current user:", error);
      return null;
    }
  },

  /**
   * Kiểm tra trạng thái đăng nhập
   */
  isAuthenticated() {
    if (typeof window !== "undefined") {
      return !!(
        localStorage.getItem("access_token") || 
        localStorage.getItem("token") || 
        localStorage.getItem("user_token")
      );
    }
    return false;
  },

  /**
   * Đồng bộ tài khoản Google
   */
  async syncGoogle(googleData) {
    try {
      const response = await apiClient.post('/auth/google', googleData);
      
      // ⚡ BỔ SUNG: Kiểm tra và lưu token vào localStorage nếu có
      // Giả sử response trả về cấu trúc có access_token
      if (response && response.access_token) {
        localStorage.setItem("access_token", response.access_token);
      } else if (response.data && response.data.access_token) {
        // Trường hợp response được bao bọc trong object data
        localStorage.setItem("access_token", response.data.access_token);
      }
      
      return response;
    } catch (error) {
      throw new Error(error.message || "Đồng bộ Google thất bại");
    }
  },

  /**
   * 🔑 Gửi mã OTP quên mật khẩu
   */
  async forgotPassword(email) {
    try {
      return await apiClient.post("/auth/forgot-password", { email });
    } catch (error) {
      throw new Error(error.message || "Không thể gửi mã xác nhận");
    }
  },

  /**
   * 🔑 Xác thực mã OTP
   */
  async verifyOtp(email, otp) {
    try {
      return await apiClient.post("/auth/verify-otp", { email, otp });
    } catch (error) {
      throw new Error(error.message || "Mã xác nhận không đúng");
    }
  },

  /**
   * 🔑 Đặt lại mật khẩu mới
   */
  async resetPassword(email, otp, password) {
    try {
      return await apiClient.post("/auth/reset-password", { email, otp, password });
    } catch (error) {
      throw new Error(error.message || "Đặt lại mật khẩu thất bại");
    }
  },
};

export default authService;