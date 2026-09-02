// src/services/adminChatService.js
// Chat hỗ trợ Admin <-> Student/Tutor — kết nối thẳng Laravel API

import apiClient from "./apiClient";

class AdminChatService {
  // ─── Helpers ─────────────────────────────────────────────────────────────

  _unwrap(res) {
    // apiClient trả về raw JSON — hỗ trợ cả { success, data } và array trực tiếp
    return res;
  }

  // ─── ADMIN SIDE ──────────────────────────────────────────────────────────

  /** GET /api/admin/chat/conversations */
  async getAdminConversations() {
    return apiClient.get("/admin/chat/conversations");
  }

  /** GET /api/admin/chat/conversations/{id}/messages */
  async getAdminMessages(conversationId) {
    return apiClient.get(`/admin/chat/conversations/${conversationId}/messages`);
  }

  /** POST /api/admin/chat/conversations/{id}/messages  { content } */
  async sendAdminMessage(conversationId, content) {
    return apiClient.post(
      `/admin/chat/conversations/${conversationId}/messages`,
      { content }
    );
  }

  /** GET /api/admin/chat/unread-count */
  async getAdminUnreadCount() {
    return apiClient.get("/admin/chat/unread-count");
  }

  /** GET /api/admin/chat/search-users?q={keyword} */
  async searchUsers(keyword = "") {
    const q = encodeURIComponent(keyword.trim());
    return apiClient.get(`/admin/chat/search-users?q=${q}`);
  }

  // ─── STUDENT / TUTOR SIDE ────────────────────────────────────────────────

  /**
   * Lấy hoặc tạo conversation admin_support giữa user hiện tại và admin.
   * GET /api/conversations/with-admin
   */
  async ensureAdminConversation(userId) {
    // userId không cần truyền lên — BE lấy từ token
    return apiClient.get("/conversations/with-admin");
  }

  /**
   * Lấy danh sách conversations của một user.
   * GET /api/conversations?user_id={id}
   */
  async getUserConversations(userId) {
    return apiClient.get(`/conversations?user_id=${userId}`);
  }

  /**
   * Lấy tin nhắn theo conversation_id.
   * GET /api/messages/by-conversation/{id}
   */
  async getMessagesByConversation(conversationId) {
    return apiClient.get(`/messages/by-conversation/${conversationId}`);
  }

  /**
   * Gửi tin nhắn (student/tutor).
   * POST /api/messages
   */
  async sendUserMessage(payload) {
    return apiClient.post("/messages", payload);
  }

  /**
   * Cập nhật last_message / unread_count của conversation.
   * PATCH /api/conversations/{id}
   */
  async updateConversation(conversationId, payload) {
    return apiClient.patch(`/conversations/${conversationId}`, payload);
  }

  /**
   * Tổng unread của user (student/tutor).
   * POST /api/conversations/unread-count  { user_id }
   */
  async getUserUnreadCount(userId) {
    return apiClient.post("/conversations/unread-count", { user_id: userId });
  }
}

const adminChatService = new AdminChatService();
export default adminChatService;
