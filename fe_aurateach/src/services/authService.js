// src/services/authService.js

// === SERVICE LAYER - Dễ dàng thay thế backend ===

class AuthService {
  constructor() {
    // Đọc từ environment variable
    this.useApi = process.env.NEXT_PUBLIC_USE_API === 'true'; 
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    // URL của JSON Server chạy mock data
    this.jsonServerUrl = "http://localhost:3007"; 
  }

  // === LOGIN ===
  async login(email, password) {
    if (this.useApi) {
      return this.loginWithApi(email, password);
    } else {
      return this.loginWithJson(email, password);
    }
  }

  // Login với JSON Server (Mock Data)
  async loginWithJson(email, password) {
    try {
      const response = await fetch(`${this.jsonServerUrl}/users?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        throw new Error("Không thể kết nối đến cơ sở dữ liệu thử nghiệm (JSON Server)");
      }

      const users = await response.json();
      const user = users.find((u) => u.password === password);

      if (!user) {
        throw new Error("Email hoặc mật khẩu không đúng");
      }

      if (user.status !== "active") {
        throw new Error("Tài khoản đã bị khóa hoặc chưa được kích hoạt");
      }

      const { password: _, ...userInfo } = user;
      
      // Lưu cookie
      if (typeof window !== "undefined") {
        document.cookie = `user_info=${encodeURIComponent(JSON.stringify(userInfo))}; path=/; max-age=86400`;
        document.cookie = `role=${userInfo.role}; path=/; max-age=86400`;
        if (userInfo.user_id) {
          document.cookie = `user_id=${userInfo.user_id}; path=/; max-age=86400`;
        }
      }

      return {
        success: true,
        user: userInfo,
        message: "Đăng nhập thành công",
      };
    } catch (error) {
      throw error;
    }
  }

  // Login với API thật (Laravel)
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
      
      // Lưu cookie
      if (data.success && data.user && typeof window !== "undefined") {
        const { password: _, ...userInfo } = data.user;
        document.cookie = `user_info=${encodeURIComponent(JSON.stringify(userInfo))}; path=/; max-age=86400`;
        document.cookie = `role=${userInfo.role}; path=/; max-age=86400`;
        if (userInfo.user_id) {
          document.cookie = `user_id=${userInfo.user_id}; path=/; max-age=86400`;
        }
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // === REGISTER ===
  async register(userData) {
    if (this.useApi) {
      return this.registerWithApi(userData);
    } else {
      return this.registerWithJson(userData);
    }
  }

  // Register với JSON Server (qua Next.js API Route)
  async registerWithJson(userData) {
    try {
      const response = await fetch(`/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Đăng ký thất bại");
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Register với API thật (Laravel)
  async registerWithApi(userData) {
    const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return response.json();
  }

  // === UPDATE PROFILE ===
  async updateProfile(userId, userData) {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Cập nhật thất bại");
      }

      // Cập nhật cookie với thông tin mới
      if (result.success && result.user) {
        const { password, ...userInfo } = result.user;
        if (typeof window !== "undefined") {
          document.cookie = `user_info=${encodeURIComponent(JSON.stringify(userInfo))}; path=/; max-age=86400`;
          document.cookie = `role=${userInfo.role}; path=/; max-age=86400`;
          if (userInfo.user_id) {
            document.cookie = `user_id=${userInfo.user_id}; path=/; max-age=86400`;
          }
        }
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  // === LOGOUT ===
  async logout() {
    if (typeof window !== "undefined") {
      document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.removeItem('token');
    }
    return { success: true };
  }

  // === GET CURRENT USER ===
  async getCurrentUser() {
    if (typeof window === "undefined") return null;
    
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };

    // Ưu tiên lấy từ cookie user_info
    const userCookie = getCookie("user_info");
    if (userCookie) {
      try {
        const userInfo = JSON.parse(decodeURIComponent(userCookie));
        console.log("📋 User from cookie:", userInfo);
        
        // Đảm bảo có user_id
        if (!userInfo.user_id) {
          // Thử lấy từ cookie user_id riêng
          const userIdCookie = getCookie("user_id");
          if (userIdCookie) {
            userInfo.user_id = userIdCookie;
          }
        }
        
        return userInfo;
      } catch (error) {
        console.error("❌ Lỗi parse cookie user_info:", error);
        return null;
      }
    }

    // Fallback: Lấy từ cookie user_id
    const userIdCookie = getCookie("user_id");
    if (userIdCookie) {
      try {
        // Thử lấy user từ JSON Server
        const response = await fetch(`${this.jsonServerUrl}/users?user_id=${userIdCookie}`);
        const users = await response.json();
        const user = users[0];
        if (user) {
          const { password, ...userInfo } = user;
          // Lưu lại cookie user_info
          document.cookie = `user_info=${encodeURIComponent(JSON.stringify(userInfo))}; path=/; max-age=86400`;
          document.cookie = `role=${userInfo.role}; path=/; max-age=86400`;
          return userInfo;
        }
      } catch (error) {
        console.error("❌ Lỗi fetch user từ user_id:", error);
      }
    }

    console.warn("⚠️ Không tìm thấy user trong cookie");
    return null;
  }

  // === LẤY USER_ID ===
  async getUserId() {
    const user = await this.getCurrentUser();
    return user?.user_id || null;
  }
}

// Export singleton
const authService = new AuthService();
export default authService;