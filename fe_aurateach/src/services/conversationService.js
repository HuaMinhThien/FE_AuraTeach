import apiClient from './apiClient';

export const conversationService = {
  // Lấy danh sách tất cả các cuộc hội thoại
  getConversations: async () => {
    try {
      const response = await apiClient.get('/conversations');
      return response;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách cuộc hội thoại:", error);
      throw error;
    }
  },

  // Bạn có thể bổ sung thêm các hàm chat khác sau này ở đây (ví dụ: tạo cuộc hội thoại mới, gửi tin nhắn,...)
};