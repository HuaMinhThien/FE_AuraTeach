// src/lib/email.js
import nodemailer from 'nodemailer';

let transporter = null;

// Khởi tạo transporter
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

// Gửi email
export async function sendEmail({ to, subject, html }) {
  try {
    const transporter = getTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
}

// Template: Tutor được duyệt
export function getTutorApprovedEmail(tutorName) {
  return {
    subject: '🎉 Hồ sơ gia sư của bạn đã được phê duyệt - AuraTeach',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #00236F; margin: 0;">AuraTeach</h1>
          <p style="color: #6b7280;">Nền tảng kết nối gia sư và học viên</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #00236F; margin-top: 0;">✅ Hồ sơ đã được phê duyệt</h2>
          <p>Xin chào <strong>${tutorName}</strong>,</p>
          <p>Chúng tôi vui mừng thông báo rằng hồ sơ gia sư của bạn đã được <strong style="color: #16a34a;">phê duyệt</strong>.</p>
          <p>Bạn có thể bắt đầu tạo lớp học và nhận học viên ngay bây giờ!</p>
          <div style="text-align: center; padding: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tutor-dashboard" 
               style="display: inline-block; padding: 12px 32px; background: #00236F; color: white; text-decoration: none; border-radius: 8px;">
              Vào bảng điều khiển
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
          </p>
        </div>
        <div style="text-align: center; padding: 20px 0; color: #6b7280; font-size: 12px;">
          <p>© 2026 AuraTeach. All rights reserved.</p>
        </div>
      </div>
    `
  };
}

// Template: Tutor bị từ chối
export function getTutorRejectedEmail(tutorName, reason) {
  return {
    subject: '❌ Hồ sơ gia sư của bạn đã bị từ chối - AuraTeach',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #00236F; margin: 0;">AuraTeach</h1>
          <p style="color: #6b7280;">Nền tảng kết nối gia sư và học viên</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #dc2626; margin-top: 0;">❌ Hồ sơ bị từ chối</h2>
          <p>Xin chào <strong>${tutorName}</strong>,</p>
          <p>Chúng tôi rất tiếc phải thông báo rằng hồ sơ gia sư của bạn đã bị <strong style="color: #dc2626;">từ chối</strong>.</p>
          <div style="background: #fef2f2; padding: 12px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 16px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Lý do:</strong> ${reason || 'Không có lý do cụ thể'}</p>
          </div>
          <p>Bạn có thể chỉnh sửa hồ sơ và gửi lại yêu cầu phê duyệt.</p>
          <div style="text-align: center; padding: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile-tutor" 
               style="display: inline-block; padding: 12px 32px; background: #00236F; color: white; text-decoration: none; border-radius: 8px;">
              Chỉnh sửa hồ sơ
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
          </p>
        </div>
        <div style="text-align: center; padding: 20px 0; color: #6b7280; font-size: 12px;">
          <p>© 2026 AuraTeach. All rights reserved.</p>
        </div>
      </div>
    `
  };
}

// Template: Tài khoản bị khóa
export function getAccountLockedEmail(userName, reason) {
  return {
    subject: '🔒 Tài khoản của bạn đã bị khóa - AuraTeach',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #00236F; margin: 0;">AuraTeach</h1>
          <p style="color: #6b7280;">Nền tảng kết nối gia sư và học viên</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #dc2626; margin-top: 0;">🔒 Tài khoản đã bị khóa</h2>
          <p>Xin chào <strong>${userName}</strong>,</p>
          <p>Chúng tôi thông báo rằng tài khoản của bạn đã bị <strong style="color: #dc2626;">khóa</strong>.</p>
          ${reason ? `
            <div style="background: #fef2f2; padding: 12px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 16px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>Lý do:</strong> ${reason}</p>
            </div>
          ` : ''}
          <p>Vui lòng liên hệ với bộ phận hỗ trợ để biết thêm chi tiết.</p>
          <div style="text-align: center; padding: 20px 0;">
            <a href="mailto:${process.env.EMAIL_USER || 'support@aurateach.vn'}" 
               style="display: inline-block; padding: 12px 32px; background: #00236F; color: white; text-decoration: none; border-radius: 8px;">
              Liên hệ hỗ trợ
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
          </p>
        </div>
        <div style="text-align: center; padding: 20px 0; color: #6b7280; font-size: 12px;">
          <p>© 2026 AuraTeach. All rights reserved.</p>
        </div>
      </div>
    `
  };
}

// Template: Tài khoản được mở khóa
export function getAccountUnlockedEmail(userName) {
  return {
    subject: '🔓 Tài khoản của bạn đã được mở khóa - AuraTeach',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #00236F; margin: 0;">AuraTeach</h1>
          <p style="color: #6b7280;">Nền tảng kết nối gia sư và học viên</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #16a34a; margin-top: 0;">🔓 Tài khoản đã được mở khóa</h2>
          <p>Xin chào <strong>${userName}</strong>,</p>
          <p>Chúng tôi vui mừng thông báo rằng tài khoản của bạn đã được <strong style="color: #16a34a;">mở khóa</strong>.</p>
          <p>Bạn có thể đăng nhập và sử dụng dịch vụ của chúng tôi bình thường.</p>
          <div style="text-align: center; padding: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" 
               style="display: inline-block; padding: 12px 32px; background: #00236F; color: white; text-decoration: none; border-radius: 8px;">
              Đăng nhập ngay
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
          </p>
        </div>
        <div style="text-align: center; padding: 20px 0; color: #6b7280; font-size: 12px;">
          <p>© 2026 AuraTeach. All rights reserved.</p>
        </div>
      </div>
    `
  };
}

// Template: Rút tiền được duyệt
export function getPayoutApprovedEmail(tutorName, amount, requestCode) {
  return {
    subject: '💰 Yêu cầu rút tiền đã được phê duyệt - AuraTeach',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #00236F; margin: 0;">AuraTeach</h1>
          <p style="color: #6b7280;">Nền tảng kết nối gia sư và học viên</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #16a34a; margin-top: 0;">✅ Yêu cầu rút tiền được phê duyệt</h2>
          <p>Xin chào <strong>${tutorName}</strong>,</p>
          <p>Yêu cầu rút tiền của bạn đã được <strong style="color: #16a34a;">phê duyệt</strong>.</p>
          <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Mã yêu cầu:</strong> ${requestCode}</p>
            <p style="margin: 4px 0;"><strong>Số tiền:</strong> <span style="color: #16a34a; font-size: 20px; font-weight: bold;">${Number(amount).toLocaleString('vi-VN')}đ</span></p>
          </div>
          <p>Tiền sẽ được chuyển đến tài khoản ngân hàng của bạn trong vòng 24-48 giờ làm việc.</p>
          <div style="text-align: center; padding: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/income" 
               style="display: inline-block; padding: 12px 32px; background: #00236F; color: white; text-decoration: none; border-radius: 8px;">
              Xem lịch sử giao dịch
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
            Cảm ơn bạn đã tin tưởng AuraTeach.
          </p>
        </div>
        <div style="text-align: center; padding: 20px 0; color: #6b7280; font-size: 12px;">
          <p>© 2026 AuraTeach. All rights reserved.</p>
        </div>
      </div>
    `
  };
}

// Template: Rút tiền bị từ chối
export function getPayoutRejectedEmail(tutorName, amount, requestCode, reason) {
  return {
    subject: '❌ Yêu cầu rút tiền đã bị từ chối - AuraTeach',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #00236F; margin: 0;">AuraTeach</h1>
          <p style="color: #6b7280;">Nền tảng kết nối gia sư và học viên</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #dc2626; margin-top: 0;">❌ Yêu cầu rút tiền bị từ chối</h2>
          <p>Xin chào <strong>${tutorName}</strong>,</p>
          <p>Yêu cầu rút tiền của bạn đã bị <strong style="color: #dc2626;">từ chối</strong>.</p>
          <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border: 1px solid #fecaca; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Mã yêu cầu:</strong> ${requestCode}</p>
            <p style="margin: 4px 0;"><strong>Số tiền:</strong> ${Number(amount).toLocaleString('vi-VN')}đ</p>
            <p style="margin: 4px 0; color: #991b1b;"><strong>Lý do:</strong> ${reason || 'Không có lý do cụ thể'}</p>
          </div>
          <p>Số tiền đã được hoàn lại vào ví khả dụng của bạn.</p>
          <div style="text-align: center; padding: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/income" 
               style="display: inline-block; padding: 12px 32px; background: #00236F; color: white; text-decoration: none; border-radius: 8px;">
              Xem lịch sử giao dịch
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
          </p>
        </div>
        <div style="text-align: center; padding: 20px 0; color: #6b7280; font-size: 12px;">
          <p>© 2026 AuraTeach. All rights reserved.</p>
        </div>
      </div>
    `
  };
}

// Template: Báo cáo được giải quyết
export function getReportResolvedEmail(studentName, tutorName) {
  return {
    subject: '✅ Báo cáo gia sư đã được giải quyết - AuraTeach',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #00236F; margin: 0;">AuraTeach</h1>
          <p style="color: #6b7280;">Nền tảng kết nối gia sư và học viên</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #16a34a; margin-top: 0;">✅ Báo cáo đã được xử lý</h2>
          <p>Xin chào <strong>${studentName}</strong>,</p>
          <p>Chúng tôi thông báo rằng báo cáo của bạn về gia sư <strong>${tutorName}</strong> đã được <strong style="color: #16a34a;">giải quyết</strong>.</p>
          <p>Cảm ơn bạn đã gửi báo cáo. Chúng tôi sẽ tiếp tục cải thiện chất lượng dịch vụ.</p>
          <div style="text-align: center; padding: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/" 
               style="display: inline-block; padding: 12px 32px; background: #00236F; color: white; text-decoration: none; border-radius: 8px;">
              Về trang chủ
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
          </p>
        </div>
        <div style="text-align: center; padding: 20px 0; color: #6b7280; font-size: 12px;">
          <p>© 2026 AuraTeach. All rights reserved.</p>
        </div>
      </div>
    `
  };
}

// Template: Báo cáo bị từ chối
export function getReportRejectedEmail(studentName, tutorName) {
  return {
    subject: '❌ Báo cáo gia sư đã bị từ chối - AuraTeach',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #00236F; margin: 0;">AuraTeach</h1>
          <p style="color: #6b7280;">Nền tảng kết nối gia sư và học viên</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #dc2626; margin-top: 0;">❌ Báo cáo bị từ chối</h2>
          <p>Xin chào <strong>${studentName}</strong>,</p>
          <p>Chúng tôi thông báo rằng báo cáo của bạn về gia sư <strong>${tutorName}</strong> đã bị <strong style="color: #dc2626;">từ chối</strong>.</p>
          <p>Nếu bạn có thêm bằng chứng hoặc thông tin mới, vui lòng gửi báo cáo mới.</p>
          <div style="text-align: center; padding: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/" 
               style="display: inline-block; padding: 12px 32px; background: #00236F; color: white; text-decoration: none; border-radius: 8px;">
              Về trang chủ
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
          </p>
        </div>
        <div style="text-align: center; padding: 20px 0; color: #6b7280; font-size: 12px;">
          <p>© 2026 AuraTeach. All rights reserved.</p>
        </div>
      </div>
    `
  };
}