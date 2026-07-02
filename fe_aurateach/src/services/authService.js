import apiClient from "./apiClient";

class AuthService {
  // Đăng nhập
  async login(email, password) {
    const data = await apiClient("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    
    if (data.user) this.setAuthCookies(data.user);
    return data;
  }

  // Đăng ký
  async register(userData) {
    return await apiClient("/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  // Đăng xuất
  async logout() {
    if (typeof window !== "undefined") {
      document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    return { success: true };
  }

  // Lấy User hiện tại từ Cookie
  async getCurrentUser() {
    if (typeof window === "undefined") return null;
    const cookie = document.cookie.split('; ').find(row => row.startsWith('user_info='));
    if (!cookie) return null;
    try {
      return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
    } catch { return null; }
  }

  setAuthCookies(user) {
    if (typeof window !== "undefined") {
      // Đảm bảo object lưu vào cookie có đủ các trường bạn cần
      const userInfo = {
        id: user.user_id || user.id,
        name: user.full_name || user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "/img/default-avatar.png",
      };
      document.cookie = `user_info=${encodeURIComponent(JSON.stringify(userInfo))}; path=/; max-age=86400`;
      document.cookie = `role=${userInfo.role}; path=/; max-age=86400`;
    }
  }
}

const authService = new AuthService();
export default authService;