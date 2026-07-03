import apiClient from "./apiClient";

class AuthService {
  // Đăng nhập
  async login(email, password) {
    // Sửa thành apiClient.post
    const data = await apiClient.post("/login", { email, password });
    
    if (data.user) this.setAuthCookies(data.user);
    return data;
  }

  // Đăng ký
  async register(userData) {
    // Sửa thành apiClient.post
    return await apiClient.post("/register", userData);
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
      const userInfo = {
        id: user.user_id || user.id,
        role: user.role,
      };
      document.cookie = `user_info=${encodeURIComponent(JSON.stringify(userInfo))}; path=/; max-age=86400`;
    }
  }
}

const authService = new AuthService();
export default authService;