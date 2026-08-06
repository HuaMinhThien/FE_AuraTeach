// src/services/conversationService.js
import apiClient from './apiClient';

export const conversationService = {
  // Lấy danh sách đoạn hội thoại của user hiện tại
  getConversations: async (userId) => {
    try {
      // 🚀 Tự nối trực tiếp user_id vào URL, không dùng options.params nữa
      const response = await apiClient.get(`/conversations?user_id=${userId}`);
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("❌ [API Error] Lỗi khi lấy danh sách cuộc trò chuyện:", error);
      throw error;
    }
  },

  // Lấy tổng số tin nhắn chưa đọc của user
  getUnreadCount: async (userId) => {
    if (!userId) {
      return { unread_count: 0 };
    }

    try {
      // Chuyển sang POST và truyền user_id vào object body
      const response = await apiClient.post('/conversations/unread-count', {
        user_id: userId
      });
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("Lỗi khi lấy số lượng tin nhắn chưa đọc:", error);
      return { unread_count: 0 };
    }
  },

  createConversation: async (participants) => {
    try {
      // participants là một mảng chứa các user_id, ví dụ: ['student_id', 'tutor_userId']
      const response = await apiClient.post("/conversations", {
        participants: participants
      });
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("❌ [API Error] Lỗi khi tạo cuộc trò chuyện:", error);
      throw error;
    }
  }
};