import { NextResponse } from 'next/server';
import { notificationService } from '@/services/notificationService';

const BACKEND_URL = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

// 1. GET: Lấy danh sách học viên
export async function GET() {
  try {
    const [usersRes, studentsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/users`, { cache: 'no-store' }),
      fetch(`${BACKEND_URL}/students`, { cache: 'no-store' })
    ]);

    const users = await usersRes.json();
    const students = await studentsRes.json();

    const studentList = users
      .filter(u => u.role === 'student')
      .map(user => {
        const detail = students.find(s => s.user_id === user.user_id) || {};
        return { ...user, ...detail };
      });

    return NextResponse.json({ success: true, data: studentList });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. PUT: Khóa/Mở khóa tài khoản học viên
export async function PUT(request) {
  try {
    const { userId, status } = await request.json();

    // Lấy thông tin user hiện tại
    const userRes = await fetch(`${BACKEND_URL}/users?user_id=${userId}`);
    const userData = await userRes.json();
    
    if (!userData.length) {
      return NextResponse.json({ success: false, message: "Không tìm thấy user" }, { status: 404 });
    }

    const user = userData[0];
    const jsonServerRecordId = userData[0].id;

    // Gửi method PATCH để cập nhật status
    const updateRes = await fetch(`${BACKEND_URL}/users/${jsonServerRecordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (updateRes.ok) {
      // === GỬI THÔNG BÁO CHO USER ===
      try {
        await notificationService.notifyAccountStatusChange({
          user,
          status,
          reason: status === 'banned' ? 'Vi phạm điều khoản sử dụng' : null,
        });
      } catch (notifError) {
        console.error("❌ Lỗi gửi thông báo khóa/mở khóa:", notifError);
      }

      return NextResponse.json({ 
        success: true, 
        message: `Đã cập nhật trạng thái học viên thành: ${status === 'active' ? 'Hoạt động' : 'Bị khóa'}` 
      });
    }
    
    return NextResponse.json({ success: false, message: "Cập nhật thất bại ở Backend" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
