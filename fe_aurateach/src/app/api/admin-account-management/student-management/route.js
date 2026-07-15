import { NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:3007';

// 1. GET: Lấy danh sách học viên kết hợp thông tin mở rộng
export async function GET() {
  try {
    // Lấy đồng thời dữ liệu từ bảng users và students của JSON Server
    const [usersRes, studentsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/users`, { cache: 'no-store' }),
      fetch(`${BACKEND_URL}/students`, { cache: 'no-store' })
    ]);

    const users = await usersRes.json();
    const students = await studentsRes.json();

    // Lọc ra những user có role là student và map thông tin chi tiết từ bảng students
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

// 2. PUT: Khóa/Mở khóa tài khoản học viên (Cập nhật field status trong /users)
export async function PUT(request) {
  try {
    const { userId, status } = await request.json();

    // Lấy thông tin user hiện tại để lấy đúng ID của record trong JSON server
    const userRes = await fetch(`${BACKEND_URL}/users?user_id=${userId}`);
    const userData = await userRes.json();
    
    if (!userData.length) {
      return NextResponse.json({ success: false, message: "Không tìm thấy user" }, { status: 404 });
    }

    const jsonServerRecordId = userData[0].id; // Lấy ID tự tăng của JSON Server

    // Gửi method PATCH để cập nhật riêng field status lên BE
    const updateRes = await fetch(`${BACKEND_URL}/users/${jsonServerRecordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (updateRes.ok) {
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