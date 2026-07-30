// src/services/notificationService.js

class NotificationService {
  constructor() {
    this.jsonServerUrl = 'http://localhost:3007';
  }

  // === LẤY DANH SÁCH THÔNG BÁO CỦA USER ===
  async getNotifications(userId) {
    try {
      const res = await fetch(`${this.jsonServerUrl}/notifications?receiver_id=${userId}&_sort=created_at&_order=desc`);
      if (!res.ok) throw new Error('Không thể lấy thông báo');
      const notifications = await res.json();
      return { success: true, data: notifications };
    } catch (error) {
      console.error('❌ Lỗi lấy thông báo:', error);
      return { success: false, data: [], message: error.message };
    }
  }

  // === LẤY SỐ LƯỢNG THÔNG BÁO CHƯA ĐỌC ===
  async getUnreadCount(userId) {
    try {
      const res = await fetch(`${this.jsonServerUrl}/notifications?receiver_id=${userId}&is_read=false`);
      if (!res.ok) throw new Error('Không thể lấy số thông báo');
      const notifications = await res.json();
      return { success: true, count: notifications.length };
    } catch (error) {
      console.error('❌ Lỗi lấy số thông báo chưa đọc:', error);
      return { success: false, count: 0 };
    }
  }

  // === TẠO THÔNG BÁO MỚI ===
  async createNotification({ receiver_id, receiver_role, type, title, message, related_id, related_type }) {
    try {
      const newNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        receiver_id,
        receiver_role,
        type, // 'booking', 'payment', 'system', 'message'
        title,
        message,
        related_id: related_id || null,
        related_type: related_type || null, // 'booking', 'course', 'payment'
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const res = await fetch(`${this.jsonServerUrl}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotification),
      });

      if (!res.ok) throw new Error('Không thể tạo thông báo');
      const saved = await res.json();
      console.log(`📬 [Notification] Created for ${receiver_role} (${receiver_id}):`, saved);
      return { success: true, data: saved };
    } catch (error) {
      console.error('❌ Lỗi tạo thông báo:', error);
      return { success: false, message: error.message };
    }
  }

  // === TẠO THÔNG BÁO KHI CÓ BOOKING MỚI ===
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
  }

  // === TẠO THÔNG BÁO KHI THANH TOÁN THÀNH CÔNG ===
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
  }

  // === ĐÁNH DẤU ĐÃ ĐỌC ===
  async markAsRead(notificationId) {
    try {
      // Tìm notification
      const findRes = await fetch(`${this.jsonServerUrl}/notifications?id=${notificationId}`);
      const notifications = await findRes.json();
      const notif = notifications[0];
      if (!notif) throw new Error('Không tìm thấy thông báo');

      const res = await fetch(`${this.jsonServerUrl}/notifications/${notif.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      });

      if (!res.ok) throw new Error('Không thể đánh dấu đã đọc');
      return { success: true };
    } catch (error) {
      console.error('❌ Lỗi đánh dấu đã đọc:', error);
      return { success: false };
    }
  }

  // === ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC ===
  async markAllAsRead(userId) {
    try {
      const res = await fetch(`${this.jsonServerUrl}/notifications?receiver_id=${userId}&is_read=false`);
      const notifications = await res.json();

      await Promise.all(
        notifications.map(notif =>
          fetch(`${this.jsonServerUrl}/notifications/${notif.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_read: true }),
          })
        )
      );

      console.log(`✅ Đã đánh dấu ${notifications.length} thông báo là đã đọc`);
      return { success: true, count: notifications.length };
    } catch (error) {
      console.error('❌ Lỗi đánh dấu tất cả đã đọc:', error);
      return { success: false };
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;

