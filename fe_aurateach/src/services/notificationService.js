import apiClient from "./apiClient";

export const notificationService = {
  /**
   * Lấy danh sách thông báo theo userId 
   * @param {string|number} userId 
   */
  async getNotifications(userId) {
    try {
      const response = await apiClient.get(`/notifications?user_id=${userId}`);
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error("⚠️ Lỗi khi tải thông báo:", error);
      return [];
    }
  },

  /**
   * Lấy số lượng thông báo chưa đọc của user
   * @param {string|number} userId 
   */
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

  /**
   * TẠO THÔNG BÁO MỚI
   */
  async createNotification({ receiver_id, receiver_role, type, title, message, related_id, related_type }) {
    try {
      const newNotification = {
        receiver_id,
        receiver_role,
        type, // 'booking', 'payment', 'system', 'message'
        title,
        message,
        related_id: related_id || null,
        related_type: related_type || null, // 'booking', 'course', 'payment'
        is_read: false,
      };

      const response = await apiClient.post('/notifications', newNotification);
      const saved = response.data || response;
      console.log(`📬 [Notification] Created for ${receiver_role} (${receiver_id}):`, saved);
      return { success: true, data: saved };
    } catch (error) {
      console.error('❌ Lỗi tạo thông báo:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * TẠO THÔNG BÁO KHI CÓ BOOKING MỚI
   */
  async notifyNewBooking(bookingData, tutorUserId, studentName, courseTitle) {
    const results = [];

    // 1. Thông báo cho tutor
    const tutorNotif = await this.createNotification({
      receiver_id: tutorUserId,
      receiver_role: 'tutor',
      type: 'booking',
      title: '📩 Đăng ký khóa học mới',
      message: `Học viên ${studentName} đã đăng ký khóa học "${courseTitle}".`,
      related_id: bookingData.booking_id,
      related_type: 'booking',
    });
    results.push(tutorNotif);

    // 2. Thông báo cho admin
    const adminNotif = await this.createNotification({
      receiver_id: 'u-admin-1',
      receiver_role: 'admin',
      type: 'booking',
      title: '📊 Đăng ký khóa học mới',
      message: `Học viên ${studentName} đã đăng ký khóa học "${courseTitle}" với gia sư.`,
      related_id: bookingData.booking_id,
      related_type: 'booking',
    });
    results.push(adminNotif);

    return results;
  },

  /**
   * TẠO THÔNG BÁO KHI THANH TOÁN THÀNH CÔNG
   */
  async notifyPaymentSuccess(bookingData, tutorUserId, studentName, courseTitle, amount) {
    const results = [];

    // 1. Thông báo cho tutor
    const tutorNotif = await this.createNotification({
      receiver_id: tutorUserId,
      receiver_role: 'tutor',
      type: 'payment',
      title: '💰 Thanh toán thành công',
      message: `Học viên ${studentName} đã thanh toán ${amount?.toLocaleString('vi-VN')}đ cho khóa học "${courseTitle}".`,
      related_id: bookingData.booking_id,
      related_type: 'payment',
    });
    results.push(tutorNotif);

    // 2. Thông báo cho admin
    const adminNotif = await this.createNotification({
      receiver_id: 'u-admin-1',
      receiver_role: 'admin',
      type: 'payment',
      title: '💰 Thanh toán mới',
      message: `Học viên ${studentName} đã thanh toán ${amount?.toLocaleString('vi-VN')}đ cho khóa học "${courseTitle}".`,
      related_id: bookingData.booking_id,
      related_type: 'payment',
    });
    results.push(adminNotif);

    return results;
  },

  /**
   * Đánh dấu một thông báo là đã đọc
   * @param {string|number} id 
   */
  async markAsRead(id) {
    try {
      return await apiClient.patch(`/notifications/${id}`, { is_read: true });
    } catch (error) {
      console.error(`❌ Lỗi đánh dấu đã đọc thông báo ${id}:`, error);
      throw error;
    }
  },

  /**
   * Đánh dấu tất cả thông báo của user là đã đọc
   * @param {string|number} userId 
   */
  async markAllAsRead(userId) {
    try {
      const notifications = await this.getNotifications(userId);
      const unreadList = notifications.filter(n => !n.is_read);

      await Promise.all(
        unreadList.map(notif => this.markAsRead(notif.id))
      );

      console.log(`✅ Đã đánh dấu ${unreadList.length} thông báo là đã đọc`);
      return { success: true, count: unreadList.length };
    } catch (error) {
      console.error('❌ Lỗi đánh dấu tất cả đã đọc:', error);
      return { success: false, count: 0 };
    }
  }
};

export default notificationService;