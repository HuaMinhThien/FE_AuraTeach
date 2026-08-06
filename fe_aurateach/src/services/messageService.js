// src/services/messageService.js
import apiClient from './apiClient';

export const messageService = {
  // Lấy danh sách tin nhắn theo cuộc trò chuyện
  getMessages: async (conversationId) => {
    console.log("🔍 [DEBUG messageService.getMessages] Nhận vào conversationId:", conversationId, typeof conversationId);

    if (!conversationId || conversationId === 'undefined' || conversationId === '[object Object]') {
      throw new Error("Thiếu hoặc không hợp lệ conversation_id");
    }

    try {
      // 🚀 Gọi theo chuẩn route động /api/messages/by-conversation/{id}
      const response = await apiClient.get(`/messages/by-conversation/${conversationId}`);
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error(`Lỗi khi lấy tin nhắn của conversation ${conversationId}:`, error);
      throw error;
    }
  },

  // Gửi tin nhắn mới
  sendMessage: async (messageData) => {
    try {
      const response = await apiClient.post('/messages', messageData);
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      throw error;
    }
  },

  // Cập nhật trạng thái cuộc trò chuyện (last message, thời gian, unread_count)
  updateConversation: async (conversationId, updateData) => {
    try {
      const response = await apiClient.patch(`/conversations/${conversationId}`, updateData);
      return response.data !== undefined ? response.data : response;
    } catch (error) {
      console.error(`Lỗi khi cập nhật conversation ${conversationId}:`, error);
      throw error;
    }
  }
};