// src/services/notificationService.js
import { sendEmail } from '@/lib/email';
import {
  getTutorApprovedEmail,
  getTutorRejectedEmail,
  getAccountLockedEmail,
  getAccountUnlockedEmail,
  getPayoutApprovedEmail,
  getPayoutRejectedEmail,
  getReportResolvedEmail,
  getReportRejectedEmail,
} from '@/lib/email';

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

  // === TẠO THÔNG BÁO MỚI (In-app) ===
  async createNotification({ receiver_id, receiver_role, type, title, message, related_id, related_type }) {
    try {
      const newNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        receiver_id,
        receiver_role,
        type, // 'booking', 'payment', 'system', 'message', 'account', 'payout', 'report'
        title,
        message,
        related_id: related_id || null,
        related_type: related_type || null,
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

  // === GỬI THÔNG BÁO ĐA KÊNH (In-app + Email) ===
  async sendMultiChannelNotification({
    userId,
    userEmail,
    userName,
    userRole,
    type,
    title,
    message,
    emailSubject,
    emailHtml,
    relatedId,
    relatedType,
  }) {
    const results = [];

    // 1. Gửi In-app notification
    const inAppResult = await this.createNotification({
      receiver_id: userId,
      receiver_role: userRole,
      type,
      title,
      message,
      related_id: relatedId,
      related_type: relatedType,
    });
    results.push({ channel: 'in-app', ...inAppResult });

    // 2. Gửi Email (nếu có email)
    if (userEmail && emailSubject && emailHtml) {
      const emailResult = await sendEmail({
        to: userEmail,
        subject: emailSubject,
        html: emailHtml,
      });
      results.push({ channel: 'email', ...emailResult });
    }

    return results;
  }

  // === GỬI THÔNG BÁO XÉT DUYỆT TUTOR ===
  async notifyTutorApproval({ tutor, user, status, reason }) {
    const isApproved = status === 'approved';
    const tutorName = user?.full_name || 'Gia sư';
    const userEmail = user?.email;

    let title, message, emailSubject, emailHtml;

    if (isApproved) {
      title = '✅ Hồ sơ gia sư đã được phê duyệt';
      message = `Hồ sơ của bạn đã được phê duyệt. Bạn có thể bắt đầu tạo lớp học ngay!`;
      const emailData = getTutorApprovedEmail(tutorName);
      emailSubject = emailData.subject;
      emailHtml = emailData.html;
    } else {
      title = '❌ Hồ sơ gia sư đã bị từ chối';
      message = `Hồ sơ của bạn đã bị từ chối. Lý do: ${reason || 'Không có lý do cụ thể'}`;
      const emailData = getTutorRejectedEmail(tutorName, reason);
      emailSubject = emailData.subject;
      emailHtml = emailData.html;
    }

    return this.sendMultiChannelNotification({
      userId: user?.user_id,
      userEmail,
      userName: tutorName,
      userRole: 'tutor',
      type: 'system',
      title,
      message,
      emailSubject,
      emailHtml,
      relatedId: tutor?.tutor_id,
      relatedType: 'tutor_approval',
    });
  }

  // === GỬI THÔNG BÁO KHÓA/MỞ KHÓA TÀI KHOẢN ===
  async notifyAccountStatusChange({ user, status, reason }) {
    const isLocked = status === 'banned';
    const userName = user?.full_name || 'Người dùng';
    const userEmail = user?.email;
    const userRole = user?.role || 'student';

    let title, message, emailSubject, emailHtml;

    if (isLocked) {
      title = '🔒 Tài khoản đã bị khóa';
      message = `Tài khoản của bạn đã bị khóa. Lý do: ${reason || 'Vi phạm điều khoản sử dụng'}`;
      const emailData = getAccountLockedEmail(userName, reason);
      emailSubject = emailData.subject;
      emailHtml = emailData.html;
    } else {
      title = '🔓 Tài khoản đã được mở khóa';
      message = `Tài khoản của bạn đã được mở khóa. Bạn có thể đăng nhập bình thường.`;
      const emailData = getAccountUnlockedEmail(userName);
      emailSubject = emailData.subject;
      emailHtml = emailData.html;
    }

    return this.sendMultiChannelNotification({
      userId: user?.user_id,
      userEmail,
      userName,
      userRole,
      type: 'account',
      title,
      message,
      emailSubject,
      emailHtml,
      relatedId: user?.user_id,
      relatedType: 'account_status',
    });
  }

  // === GỬI THÔNG BÁO DUYỆT RÚT TIỀN ===
  async notifyPayoutStatus({ tutor, payoutRequest, status, reason }) {
    const isApproved = status === 'approved';
    const tutorName = tutor?.full_name || 'Gia sư';
    const userEmail = tutor?.email;
    const requestCode = payoutRequest?.request_code || 'N/A';
    const amount = payoutRequest?.amount || 0;

    let title, message, emailSubject, emailHtml;

    if (isApproved) {
      title = '💰 Yêu cầu rút tiền đã được phê duyệt';
      message = `Yêu cầu rút tiền ${requestCode} đã được phê duyệt.`;
      const emailData = getPayoutApprovedEmail(tutorName, amount, requestCode);
      emailSubject = emailData.subject;
      emailHtml = emailData.html;
    } else {
      title = '❌ Yêu cầu rút tiền đã bị từ chối';
      message = `Yêu cầu rút tiền ${requestCode} đã bị từ chối. Lý do: ${reason || 'Không có lý do cụ thể'}`;
      const emailData = getPayoutRejectedEmail(tutorName, amount, requestCode, reason);
      emailSubject = emailData.subject;
      emailHtml = emailData.html;
    }

    return this.sendMultiChannelNotification({
      userId: tutor?.user_id,
      userEmail,
      userName: tutorName,
      userRole: 'tutor',
      type: 'payout',
      title,
      message,
      emailSubject,
      emailHtml,
      relatedId: payoutRequest?.id,
      relatedType: 'payout',
    });
  }

  // === GỬI THÔNG BÁO XỬ LÝ BÁO CÁO ===
  async notifyReportStatus({ student, report, status, tutorName }) {
    const isResolved = status === 'resolved';
    const studentName = student?.full_name || 'Học viên';
    const userEmail = student?.email;
    const tutorDisplayName = tutorName || 'gia sư';

    let title, message, emailSubject, emailHtml;

    if (isResolved) {
      title = '✅ Báo cáo gia sư đã được giải quyết';
      message = `Báo cáo của bạn về gia sư ${tutorDisplayName} đã được giải quyết.`;
      const emailData = getReportResolvedEmail(studentName, tutorDisplayName);
      emailSubject = emailData.subject;
      emailHtml = emailData.html;
    } else {
      title = '❌ Báo cáo gia sư đã bị từ chối';
      message = `Báo cáo của bạn về gia sư ${tutorDisplayName} đã bị từ chối.`;
      const emailData = getReportRejectedEmail(studentName, tutorDisplayName);
      emailSubject = emailData.subject;
      emailHtml = emailData.html;
    }

    return this.sendMultiChannelNotification({
      userId: student?.user_id,
      userEmail,
      userName: studentName,
      userRole: 'student',
      type: 'report',
      title,
      message,
      emailSubject,
      emailHtml,
      relatedId: report?.id,
      relatedType: 'report',
    });
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