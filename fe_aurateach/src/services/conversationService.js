// src/services/conversationService.js
import apiClient from './apiClient';

export const conversationService = {
  // Lấy danh sách đoạn hội thoại của user hiện tại
  getConversations: async () => {
    try {
      const response = await apiClient.get('/conversations');
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách cuộc trò chuyện:", error);
      throw error;
    }
  },

  // Lấy tổng số tin nhắn chưa đọc của user
  getUnreadCount: async (userId) => {
    try {
      const response = await apiClient.get('/conversations/unread-count', {
        params: { user_id: userId }
      });
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("Lỗi khi lấy số lượng tin nhắn chưa đọc:", error);
      return { unread_count: 0 };
    }
  }
};