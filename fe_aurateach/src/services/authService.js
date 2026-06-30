// src/services/authService.js

// === SERVICE LAYER - Dễ dàng thay thế backend ===

class AuthService {
  constructor() {
    // Đọc từ environment variable
    this.useApi = process.env.NEXT_PUBLIC_USE_API === 'true'; 
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    // Thêm URL của JSON Server chạy mock data công khai
    this.jsonServerUrl = "http://localhost:3007"; 
  }

  // Phương thức login - Đây là phương thức chính sẽ được gọi
  async login(email, password) {
    if (this.useApi) {
      return this.loginWithApi(email, password);
    } else {
      return this.loginWithJson(email, password);
    }
  }

  // 1. Login với JSON / Mock JSON Server (An toàn cho Client Browser)
  async loginWithJson(email, password) {
    try {
      // Thay vì dùng fs để đọc file, ta fetch trực tiếp tới JSON Server đang chạy ở port 3007
      const response = await fetch(`${this.jsonServerUrl}/users?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        throw new Error("Không thể kết nối đến cơ sở dữ liệu thử nghiệm (JSON Server)");
      }

      const users = await response.json();
      
      // Tìm user có mật khẩu trùng khớp
      const user = users.find((u) => u.password === password);

      if (!user) {
        throw new Error("Email hoặc mật khẩu không đúng");
      }

      if (user.status !== "active") {
        throw new Error("Tài khoản đã bị khóa hoặc chưa được kích hoạt");
      }

      // Xóa password trước khi trả về để đảm bảo bảo mật công nghệ
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
    // Tương lai phối hợp viết logic POST lên JSON Server tại đây nếu cần
    return { success: true, message: "Đăng ký thành công" };
  }

  async registerWithApi(userData) {
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
    // Lấy user từ cookie trực tiếp ở trình duyệt
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