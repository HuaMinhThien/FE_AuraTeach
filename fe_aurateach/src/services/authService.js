// src/services/authService.js

// === SERVICE LAYER - Dễ dàng thay thế backend ===

// Hiện tại: Dùng JSON file
// Tương lai: Chỉ cần thay đổi hàm này để gọi API thật

import fs from "fs";
import path from "path";

class AuthService {
  constructor() {
    // Đọc từ environment variable
    this.useApi = process.env.NEXT_PUBLIC_USE_API === 'true'; 
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  }

  // Phương thức login - Đây là phương thức chính sẽ được gọi
  async login(email, password) {
    if (this.useApi) {
      return this.loginWithApi(email, password);
    } else {
      return this.loginWithJson(email, password);
    }
  }

  // 1. Login với JSON (hiện tại)
  async loginWithJson(email, password) {
    try {
      // Đọc data.json
      const dataPath = path.join(process.cwd(), "src", "data.json");
      
      if (!fs.existsSync(dataPath)) {
        throw new Error("Không tìm thấy dữ liệu");
      }

      const jsonData = fs.readFileSync(dataPath, "utf8");
      const data = JSON.parse(jsonData);

      // Tìm user
      const user = data.users.find(
        (u) => u.email === email && u.password === password
      );

      if (!user) {
        throw new Error("Email hoặc mật khẩu không đúng");
      }

      if (user.status !== "active") {
        throw new Error("Tài khoản đã bị khóa hoặc chưa được kích hoạt");
      }

      // Xóa password trước khi trả về
      const { password: _, ...userInfo } = user;

      return {
        success: true,
        user: userInfo,
        message: "Đăng nhập thành công",
      };
    } catch (error) {
      throw error;
    }
  }

  // 2. Login với API thật (tương lai)
  async loginWithApi(email, password) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Đăng nhập thất bại");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Các phương thức khác cho tương lai
  async register(userData) {
    if (this.useApi) {
      return this.registerWithApi(userData);
    } else {
      return this.registerWithJson(userData);
    }
  }

  async registerWithJson(userData) {
    // TODO: Implement register với JSON
    return { success: true, message: "Đăng ký thành công" };
  }

  async registerWithApi(userData) {
    // TODO: Implement register với API thật
    const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return response.json();
  }

  async logout() {
    // Xóa cookies ở client side
    if (typeof window !== "undefined") {
      document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    return { success: true };
  }

  async getCurrentUser() {
    // Lấy user từ cookie
    if (typeof window === "undefined") return null;
    
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };

    const userCookie = getCookie("user_info");
    if (userCookie) {
      try {
        return JSON.parse(decodeURIComponent(userCookie));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Export singleton
const authService = new AuthService();
export default authService;