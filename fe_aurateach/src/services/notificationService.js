import apiClient from "./apiClient";

export const notificationService = {
  // Lấy danh sách thông báo theo userId
  async getNotifications(userId) {
    try {
      const response = await apiClient.get(`/notifications?user_id=${userId}`);
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error("⚠️ Lỗi khi tải thông báo:", error);
      return [];
    }
  },

  // Lấy số lượng thông báo chưa đọc
  async getUnreadCount(userId) {
    try {
      const notifications = await this.getNotifications(userId);
      const unreadList = notifications.filter(n => !n.is_read);
      return { success: true, count: unreadList.length };
    } catch (error) {
      console.error('❌ Lỗi lấy số thông báo chưa đọc:', error);
      return { success: false, count: 0 };
    }
  },

  // Tạo thông báo mới — backend nhận receiver_id/receiver_role và map sang user_id/role
  async createNotification({ receiver_id, receiver_role, type, title, message }) {
    try {
      const response = await apiClient.post('/notifications', {
        receiver_id,
        receiver_role,
        type:    type    || 'system',
        title:   title   || 'Thông báo',
        message: message || '',
      });
      return { success: true, data: response.data || response };
    } catch (error) {
      console.error('❌ Lỗi tạo thông báo:', error);
      return { success: false, message: error.message };
    }
  },

  // Thông báo khi có booking mới
  async notifyNewBooking(bookingData, tutorUserId, studentName, courseTitle) {
    return Promise.all([
      this.createNotification({
        receiver_id:   tutorUserId,
        receiver_role: 'tutor',
        type:    'booking',
        title:   '📩 Đăng ký khóa học mới',
        message: `Học viên ${studentName} đã đăng ký khóa học "${courseTitle}".`,
      }),
      this.createNotification({
        receiver_id:   'u-admin-1',
        receiver_role: 'admin',
        type:    'booking',
        title:   '📊 Đăng ký khóa học mới',
        message: `Học viên ${studentName} đã đăng ký khóa học "${courseTitle}" với gia sư.`,
      }),
    ]);
  },

  // Thông báo khi thanh toán thành công
  async notifyPaymentSuccess(bookingData, tutorUserId, studentName, courseTitle, amount) {
    const amountStr = amount?.toLocaleString('vi-VN') + 'đ';
    return Promise.all([
      this.createNotification({
        receiver_id:   tutorUserId,
        receiver_role: 'tutor',
        type:    'payment',
        title:   '💰 Thanh toán thành công',
        message: `Học viên ${studentName} đã thanh toán ${amountStr} cho khóa học "${courseTitle}".`,
      }),
      this.createNotification({
        receiver_id:   'u-admin-1',
        receiver_role: 'admin',
        type:    'payment',
        title:   '💰 Thanh toán mới',
        message: `Học viên ${studentName} đã thanh toán ${amountStr} cho khóa học "${courseTitle}".`,
      }),
    ]);
  },

  // Đánh dấu 1 thông báo là đã đọc — dùng notification_id
  async markAsRead(notificationId) {
    try {
      return await apiClient.patch(`/notifications/${notificationId}`, { is_read: true });
    } catch (error) {
      console.error(`❌ Lỗi đánh dấu đã đọc thông báo ${notificationId}:`, error);
      throw error;
    }
  },

  // Đánh dấu tất cả thông báo của user là đã đọc — dùng endpoint bulk
  async markAllAsRead(userId) {
    try {
      const response = await apiClient.patch('/notifications-mark-all', { user_id: userId });
      return { success: true, count: response?.updated ?? 0 };
    } catch (error) {
      console.error('❌ Lỗi đánh dấu tất cả đã đọc:', error);
      return { success: false, count: 0 };
    }
  },
};

export default notificationService;
