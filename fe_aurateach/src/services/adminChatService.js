// src/services/adminChatService.js
//
// Service cho chức năng chat hỗ trợ: Admin <-> Student/Tutor
//
// Pattern giống adminService.js / authService.js của dự án:
//   - NEXT_PUBLIC_USE_API=false → JSON Server (localhost:3007) để test UI local
//   - NEXT_PUBLIC_USE_API=true  → Laravel API thật (NEXT_PUBLIC_API_URL)

const JSON_SERVER_URL = "http://localhost:3007";

class AdminChatService {
  constructor() {
    this.useApi = process.env.NEXT_PUBLIC_USE_API === "true";
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    this.jsonServerUrl =
      process.env.NEXT_PUBLIC_JSON_SERVER_URL || JSON_SERVER_URL;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  _getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
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

  // ─── ADMIN SIDE ──────────────────────────────────────────────────────────

  /**
   * Lấy danh sách tất cả conversation hỗ trợ (admin).
   * API:  GET /api/admin/chat/conversations
   * JSON: filter type=admin_support + enrich other_user
   */
  async getAdminConversations() {
    if (this.useApi) {
      return this._apiFetch("/admin/chat/conversations");
    }

    // JSON Server mode
    const adminId = this._getCurrentUserId() || "u-admin-1";
    const [allConvs, allUsers] = await Promise.all([
      this._jsonFetch("/conversations"),
      this._jsonFetch("/users"),
    ]);

    const adminConvs = allConvs.filter(
      (c) => c.type === "admin_support" && c.participants?.includes(adminId)
    );

    const enriched = adminConvs.map((conv) => {
      const otherId = conv.participants?.find((p) => p !== adminId) ?? null;
      const otherUser =
        allUsers.find((u) => u.user_id === otherId || u.id === otherId) ?? null;
      return {
        ...conv,
        conversation_id: conv.id,
        unread_count: conv.unread_count ?? 0,
        other_user: otherUser
          ? {
              user_id: otherUser.user_id,
              full_name: otherUser.full_name,
              avatar: otherUser.avatar,
              role: otherUser.role,
            }
          : { user_id: otherId, full_name: "Người dùng", avatar: null, role: "student" },
      };
    });

    return { success: true, data: enriched };
  }

  /**
   * Lấy tin nhắn trong một conversation (admin).
   * API:  GET /api/admin/chat/conversations/{id}/messages
   * JSON: GET /messages?conversation_id={id}  (sort asc + reset unread)
   */
  async getAdminMessages(conversationId) {
    if (this.useApi) {
      return this._apiFetch(`/admin/chat/conversations/${conversationId}/messages`);
    }

    const msgs = await this._jsonFetch(
      `/messages?conversation_id=${conversationId}`
    );
    const sorted = [...msgs].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    // Reset unread cho admin (fire-and-forget)
    this._jsonFetch(`/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({ unread_count: 0 }),
    }).catch(() => {});

    return { success: true, data: sorted };
  }

  /**
   * Admin gửi tin nhắn.
   * API:  POST /api/admin/chat/conversations/{id}/messages  { content }
   * JSON: POST /messages  +  PATCH /conversations/{id}
   */
  async sendAdminMessage(conversationId, content) {
    if (this.useApi) {
      return this._apiFetch(
        `/admin/chat/conversations/${conversationId}/messages`,
        { method: "POST", body: JSON.stringify({ content }) }
      );
    }

    const adminId = this._getCurrentUserId() || "u-admin-1";
    const conv = await this._jsonFetch(`/conversations/${conversationId}`).catch(
      () => null
    );
    const receiverId =
      conv?.participants?.find((p) => p !== adminId) ?? null;
    const allUsers = await this._jsonFetch("/users");
    const receiver = allUsers.find(
      (u) => u.user_id === receiverId || u.id === receiverId
    );

    const now = new Date().toISOString();
    const newMsg = {
      id: this._genId("msg"),
      conversation_id: conversationId,
      sender_id: adminId,
      sender_role: "admin",
      receiver_id: receiverId,
      receiver_role: receiver?.role ?? "student",
      content,
      created_at: now,
      is_read: false,
    };

    const savedMsg = await this._jsonFetch("/messages", {
      method: "POST",
      body: JSON.stringify(newMsg),
    });

    // Cập nhật conversation: last_message + tăng unread của receiver
    if (conv) {
      this._jsonFetch(`/conversations/${conversationId}`, {
        method: "PATCH",
        body: JSON.stringify({
          last_message: content,
          last_message_time: now,
          unread_count: (conv.unread_count ?? 0) + 1,
        }),
      }).catch(() => {});
    }

    return { success: true, data: savedMsg };
  }

  /**
   * Tổng số tin chưa đọc của admin.
   * API:  GET /api/admin/chat/unread-count
   * JSON: tính từ conversations type=admin_support
   */
  async getAdminUnreadCount() {
    if (this.useApi) {
      return this._apiFetch("/admin/chat/unread-count");
    }

    const adminId = this._getCurrentUserId() || "u-admin-1";
    const convs = await this._jsonFetch("/conversations");
    const total = convs
      .filter(
        (c) =>
          c.type === "admin_support" && c.participants?.includes(adminId)
      )
      .reduce((s, c) => s + (c.unread_count ?? 0), 0);

    return { success: true, unread_count: total };
  }

  // ─── STUDENT / TUTOR SIDE ────────────────────────────────────────────────

  /**
   * Lấy hoặc tạo conversation hỗ trợ giữa user và admin.
   * API:  GET /api/conversations/with-admin
   * JSON: tìm conversation type=admin_support, tạo mới nếu chưa có
   */
  async ensureAdminConversation(userId) {
    if (this.useApi) {
      return this._apiFetch("/conversations/with-admin");
    }

    const uid = userId ?? this._getCurrentUserId();
    if (!uid) throw new Error("Không tìm thấy user_id");

    const [allConvs, allUsers] = await Promise.all([
      this._jsonFetch("/conversations"),
      this._jsonFetch("/users"),
    ]);

    const admin = allUsers.find((u) => u.role === "admin");
    if (!admin) throw new Error("Không có admin nào trong hệ thống");
    const adminId = admin.user_id ?? admin.id;

    const existing = allConvs.find(
      (c) =>
        c.type === "admin_support" &&
        c.participants?.includes(uid) &&
        c.participants?.includes(adminId)
    );

    if (existing) {
      return {
        success: true,
        message: "Đã tồn tại cuộc trò chuyện",
        data: { ...existing, conversation_id: existing.id },
      };
    }

    // Tạo mới
    const now = new Date().toISOString();
    const saved = await this._jsonFetch("/conversations", {
      method: "POST",
      body: JSON.stringify({
        id: this._genId("conv_admin"),
        participants: [uid, adminId],
        type: "admin_support",
        last_message: "",
        last_message_time: now,
        unread_count: 0,
      }),
    });

    return {
      success: true,
      message: "Tạo cuộc trò chuyện hỗ trợ thành công",
      data: { ...saved, conversation_id: saved.id },
    };
  }

  /**
   * Lấy danh sách tất cả conversations của một user.
   * API:  GET /api/conversations?user_id={id}
   * JSON: lọc participants + enrich other_user + map tutor_id<->user_id
   */
  async getUserConversations(userId) {
    if (this.useApi) {
      return this._apiFetch(`/conversations?user_id=${userId}`);
    }

    const [allConvs, allUsers, allTutors] = await Promise.all([
      this._jsonFetch("/conversations"),
      this._jsonFetch("/users"),
      this._jsonFetch("/tutors").catch(() => []),
    ]);

    // Map tutor_id <-> user_id
    const tutorToUser = {};
    const userToTutor = {};
    allTutors.forEach((t) => {
      if (t.tutor_id && t.user_id) {
        tutorToUser[t.tutor_id] = t.user_id;
        userToTutor[t.user_id] = t.tutor_id;
      }
    });

    // Tất cả IDs có thể của user hiện tại
    const myIds = [userId];
    if (userToTutor[userId]) myIds.push(userToTutor[userId]);

    const myConvs = allConvs.filter((c) =>
      c.participants?.some((p) => myIds.includes(p))
    );

    const enriched = myConvs.map((conv) => {
      const otherId =
        conv.participants?.find((p) => !myIds.includes(p)) ?? null;
      const lookupId = tutorToUser[otherId] ?? otherId;
      const otherUser = allUsers.find(
        (u) => u.user_id === lookupId || u.id === lookupId
      );
      return {
        ...conv,
        conversation_id: conv.id,
        unread_count: conv.unread_count ?? 0,
        other_user: otherUser
          ? {
              user_id: otherUser.user_id,
              full_name: otherUser.full_name,
              avatar: otherUser.avatar,
              role: otherUser.role,
            }
          : { user_id: lookupId, full_name: "Người dùng", avatar: null, role: "tutor" },
        other_user_id: lookupId,
        is_admin_conv: conv.type === "admin_support",
      };
    });

    return { success: true, data: enriched };
  }

  /**
   * Lấy tin nhắn theo conversation_id.
   * API:  GET /api/messages/by-conversation/{id}  → trả array trực tiếp
   * JSON: GET /messages?conversation_id={id}       → sort asc
   */
  async getMessagesByConversation(conversationId) {
    if (this.useApi) {
      const res = await fetch(
        `${this.apiBaseUrl}/messages/by-conversation/${conversationId}`,
        { headers: this._authHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json(); // Laravel trả thẳng array, không wrap
    }

    const msgs = await this._jsonFetch(
      `/messages?conversation_id=${conversationId}`
    );
    return [...msgs].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  }

  /**
   * Gửi tin nhắn (student/tutor).
   * API:  POST /api/messages
   * JSON: POST /messages  +  PATCH /conversations/{id}  (cập nhật last_message)
   */
  async sendUserMessage(payload) {
    if (this.useApi) {
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

    // JSON Server: id thay vì message_id
    const msgToSave = {
      ...payload,
      id: payload.message_id ?? this._genId("msg"),
    };
    delete msgToSave.message_id;

    const savedMsg = await this._jsonFetch("/messages", {
      method: "POST",
      body: JSON.stringify(msgToSave),
    });

    // Cập nhật last_message của conversation (fire-and-forget)
    this._jsonFetch(`/conversations/${payload.conversation_id}`, {
      method: "PATCH",
      body: JSON.stringify({
        last_message: payload.content,
        last_message_time: payload.created_at ?? new Date().toISOString(),
      }),
    }).catch(() => {});

    return savedMsg;
  }

  /**
   * Cập nhật last_message / unread_count của conversation.
   * API:  PATCH /api/conversations/{id}
   * JSON: PATCH /conversations/{id}
   *       - unread_count=0  → đánh dấu đã đọc
   *       - increment_unread_for → tăng unread_count lên 1
   */
  async updateConversation(conversationId, payload) {
    if (this.useApi) {
      return this._apiFetch(`/conversations/${conversationId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }

    let patchBody = { ...payload };
    delete patchBody.user_id; // JSON Server không cần

    if (patchBody.increment_unread_for) {
      // Tăng unread_count lên 1 cho người nhận
      try {
        const conv = await this._jsonFetch(`/conversations/${conversationId}`);
        patchBody = {
          last_message: payload.last_message ?? conv.last_message,
          last_message_time: payload.last_message_time ?? conv.last_message_time,
          unread_count: (conv.unread_count ?? 0) + 1,
        };
      } catch (_) {
        delete patchBody.increment_unread_for;
      }
    }

    return this._jsonFetch(`/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify(patchBody),
    });
  }

  /**
   * Tổng unread của user (student/tutor).
   * API:  POST /api/conversations/unread-count  { user_id }
   * JSON: tính từ conversations theo participants
   */
  async getUserUnreadCount(userId) {
    if (this.useApi) {
      return this._apiFetch("/conversations/unread-count", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
    }

    const convs = await this._jsonFetch("/conversations");
    const total = convs
      .filter((c) => c.participants?.includes(userId))
      .reduce((s, c) => s + (c.unread_count ?? 0), 0);

    return { success: true, unread_count: total };
  }
}

// Export singleton (giống authService.js, adminService.js)
const adminChatService = new AdminChatService();
export default adminChatService;
