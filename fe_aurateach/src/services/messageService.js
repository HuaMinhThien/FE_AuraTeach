// src/services/messageService.js
import apiClient from './apiClient';

export const messageService = {
  // Lấy danh sách tin nhắn theo cuộc trò chuyện
  getMessages: async (conversationId) => {
    try {
      const response = await apiClient.get('/messages', {
        params: {
          conversation_id: conversationId,
          _sort: 'created_at',
          _order: 'asc'
        }
      });
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