// src/services/adminChatService.js
//
// Service cho chức năng chat hỗ trợ: Admin <-> Student/Tutor
//
// Pattern giống adminService.js / authService.js của dự án:
//   - Gọi trực tiếp Laravel API (NEXT_PUBLIC_API_URL)
//   - NEXT_PUBLIC_USE_API=true  → Laravel API thật (NEXT_PUBLIC_API_URL)

// const JSON_SERVER_URL = "http://localhost:8000/api";
const JSON_SERVER_URL = "https://api.aurateach.io.vn/api";

class AdminChatService {
  constructor() {
    this.useApi = process.env.NEXT_PUBLIC_USE_API === "true";
    // this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.aurateach.io.vn/api";
    this.jsonServerUrl =
      process.env.NEXT_PUBLIC_JSON_SERVER_URL || JSON_SERVER_URL;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  _getToken() {
    if (typeof window === "undefined") return null;
    // Đọc cùng thứ tự ưu tiên với apiClient.js
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("user_token")
    );
  }

  _authHeaders() {
    const token = this._getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async _apiFetch(path, options = {}) {
    const res = await fetch(`${this.apiBaseUrl}${path}`, {
      ...options,
      headers: { ...this._authHeaders(), ...(options.headers || {}) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  async _jsonFetch(path, options = {}) {
    const res = await fetch(`${this.jsonServerUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    if (!res.ok) throw new Error(`JSON Server HTTP ${res.status}`);
    return res.json();
  }

  _genId(prefix = "conv_admin") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  _getCookieValue(name) {
    if (typeof document === "undefined") return null;
    const val = `; ${document.cookie}`;
    const parts = val.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }

  _getCurrentUserFromCookie() {
    try {
      const raw = this._getCookieValue("user_info");
      if (!raw) return null;
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }

  _getCurrentUserId() {
    const user = this._getCurrentUserFromCookie();
    return user?.user_id ?? user?.id ?? null;
  }

  /**
   * Tìm kiếm tất cả user đã đăng ký (trừ admin) theo tên hoặc email.
   * API:  GET /api/admin/chat/search-users?q={keyword}
   * JSON: lọc từ /users + kiểm tra conversation đã có chưa
   *
   * Trả về: [{ user_id, full_name, email, avatar, role, conversation_id|null }]
   */
  async searchUsers(keyword = "") {
    const q = encodeURIComponent(keyword.trim());
    return this._apiFetch(`/admin/chat/search-users?q=${q}`);
  }

  // ─── ADMIN SIDE ──────────────────────────────────────────────────────────

  async getAdminConversations() {
    return this._apiFetch("/admin/chat/conversations");
  }

  async getAdminMessages(conversationId) {
    return this._apiFetch(`/admin/chat/conversations/${conversationId}/messages`);
  }

  async sendAdminMessage(conversationId, content) {
    return this._apiFetch(
      `/admin/chat/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify({ content }) }
    );
  }

  async getAdminUnreadCount() {
    return this._apiFetch("/admin/chat/unread-count");
  }

  // ─── STUDENT / TUTOR SIDE ────────────────────────────────────────────────

  /**
   * Lấy hoặc tạo conversation hỗ trợ giữa user và admin.
   * API:  GET /api/conversations/with-admin
   * JSON: tìm conversation type=admin_support, tạo mới nếu chưa có
   */
  async ensureAdminConversation(userId) {
    return this._apiFetch("/conversations/with-admin");
  }

  /**
   * Lấy danh sách tất cả conversations của một user.
   * API:  GET /api/conversations?user_id={id}
   * JSON: lọc participants + enrich other_user + map tutor_id<->user_id
   */
  async getUserConversations(userId) {
    // Luôn gọi real API — không phụ thuộc useApi flag
    return this._apiFetch(`/conversations?user_id=${encodeURIComponent(userId)}`);
  }

  /**
   * Lấy tin nhắn theo conversation_id.
   * API:  GET /api/messages/by-conversation/{id}  → trả array trực tiếp
   * JSON: GET /messages?conversation_id={id}       → sort asc
   */
  async getMessagesByConversation(conversationId) {
    const res = await fetch(
      `${this.apiBaseUrl}/messages/by-conversation/${conversationId}`,
      { headers: this._authHeaders() }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async sendUserMessage(payload) {
    const res = await fetch(`${this.apiBaseUrl}/messages`, {
      method: "POST",
      headers: this._authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  /**
   * Cập nhật last_message / unread_count của conversation.
   * API:  PATCH /api/conversations/{id}
   * JSON: PATCH /conversations/{id}
   *       - unread_count=0  → đánh dấu đã đọc
   *       - increment_unread_for → tăng unread_count lên 1
   */
  async updateConversation(conversationId, payload) {
    return this._apiFetch(`/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async getUserUnreadCount(userId) {
    return this._apiFetch("/conversations/unread-count", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  }
}

// Export singleton (giống authService.js, adminService.js)
const adminChatService = new AdminChatService();
export default adminChatService;
